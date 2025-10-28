package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.Checklists;
import com.foxconn.sopchecklist.entity.TimeRepeatChecklist;
import com.foxconn.sopchecklist.repository.ChecklistDetailRepository;
import com.foxconn.sopchecklist.repository.ChecklistsRepository;
import com.foxconn.sopchecklist.repository.TimeRepeatChecklistRepository;
import com.foxconn.sopchecklist.service.MailChecklistService;
import com.foxconn.sopchecklist.service.TimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class ChecklistDetailScheduler {

    private static final Logger log = LoggerFactory.getLogger(ChecklistDetailScheduler.class);

    @Autowired
    private ChecklistsRepository checklistsRepository;

    @Autowired
    private ChecklistDetailRepository detailRepository;

    @Autowired
    private TimeRepeatChecklistRepository repeatRepository;

    @Autowired
    private TimeService timeService;
    
    @Autowired
    private MailChecklistService mailChecklistService;
    
    @PersistenceContext
    private EntityManager entityManager;

    // Chạy mỗi phút để sinh checklist detail nếu đến hạn
    @Scheduled(fixedDelay = 60000)
    @Transactional(readOnly = false)
    public void generateDetailsBySchedule() {
        LocalDateTime now = timeService.nowVietnam();
        try {
            // Clear Hibernate cache để đảm bảo lấy dữ liệu mới nhất
            entityManager.clear();
            List<Checklists> all = checklistsRepository.findAll();
            log.info("ChecklistDetailScheduler: Found {} checklists at {}", all.size(), now);
            
            for (Checklists cl : all) {
                // Refresh entity để đảm bảo có dữ liệu mới nhất
                Checklists freshChecklist = checklistsRepository.findById(cl.getId()).orElse(cl);
                log.info("Processing checklist: id={}, taskName={}, status={}, startAt={}, repeatId={}", 
                    freshChecklist.getId(), freshChecklist.getTaskName(), freshChecklist.getStatus(), 
                    freshChecklist.getStartAt(), freshChecklist.getRepeatId());
                // Chỉ tạo checklist detail cho các checklist có status ACTIVE
                if (!"ACTIVE".equals(freshChecklist.getStatus())) {
                    log.info("Skipping checklist {} (status: {})", freshChecklist.getId(), freshChecklist.getStatus());
                    continue;
                }
                if (freshChecklist.getStartAt() == null || freshChecklist.getImplementers() == null || freshChecklist.getImplementers().isEmpty()) {
                    log.info("Skipping checklist {} (missing startAt or implementers)", freshChecklist.getId());
                    continue;
                }

                boolean noRepeat = (freshChecklist.getRepeatId() == null);

                // Nếu checklist KHÔNG lặp: luôn dùng thời gian startAt hiện tại để sinh, kể cả khi đã sửa startAt
                if (noRepeat) {
                    LocalDateTime target = freshChecklist.getStartAt();
                    if (target != null && !target.isAfter(now)) {
                        for (String imp : freshChecklist.getImplementers()) {
                            if (imp == null || imp.trim().isEmpty()) continue;
                            if (detailRepository.existsByChecklistAndImplementerAndScheduledAt(freshChecklist, imp, target)) continue;
                            ChecklistDetail d = new ChecklistDetail();
                            d.setChecklist(freshChecklist);
                            d.setTaskName(freshChecklist.getTaskName());
                            d.setWorkContent(freshChecklist.getWorkContent());
                            d.setImplementer(imp);
                            d.setScheduledAt(target);
                            d.setCreatedAt(now);
                            // deadline = scheduled_at + due_in_days (ưu tiên theo thời điểm phải làm)
                            Integer due = freshChecklist.getDueInDays();
                            if (due != null && due > 0) {
                                d.setDeadlineAt(target.plusDays(due));
                            }
                            detailRepository.save(d);
                            // Enqueue mail for the newly created checklist detail
                            try { mailChecklistService.queueChecklistDetailMail(d); } catch (Exception ignore) {}
                            log.info("Generated checklist detail (no-repeat): checklist={}, implementer={}, scheduledAt={}", freshChecklist.getId(), imp, target);
                        }
                    }
                    // Không xử lý tiếp vòng lặp cho checklist không lặp
                    continue;
                }

                // Checklist có lặp: tính lần kế tiếp theo bản ghi gần nhất hoặc startAt nếu chưa có
                // Nếu có thay đổi startAt hoặc repeatId, tính từ thời gian mới
                LocalDateTime nextOccurrence = detailRepository.findTopByChecklistOrderByScheduledAtDesc(freshChecklist)
                        .map(last -> {
                            // Kiểm tra xem có thay đổi về thời gian bắt đầu hoặc lặp lại không
                            if (freshChecklist.getScheduleUpdatedAt() != null && 
                                freshChecklist.getScheduleUpdatedAt().isAfter(last.getCreatedAt())) {
                                log.info("Checklist {} schedule has been updated after last detail creation, recalculating from new startAt: {}", 
                                    freshChecklist.getId(), freshChecklist.getStartAt());
                                return freshChecklist.getStartAt();
                            }
                            return computeNextOccurrence(last.getScheduledAt(), freshChecklist.getRepeatId());
                        })
                        .orElse(freshChecklist.getStartAt());

                while (nextOccurrence != null && !nextOccurrence.isAfter(now)) {
                    for (String imp : freshChecklist.getImplementers()) {
                        if (imp == null || imp.trim().isEmpty()) continue;
                        if (detailRepository.existsByChecklistAndImplementerAndScheduledAt(freshChecklist, imp, nextOccurrence)) continue;
                        ChecklistDetail d = new ChecklistDetail();
                        d.setChecklist(freshChecklist);
                        d.setTaskName(freshChecklist.getTaskName());
                        d.setWorkContent(freshChecklist.getWorkContent());
                        d.setImplementer(imp);
                        d.setScheduledAt(nextOccurrence);
                        d.setCreatedAt(now);
                        // deadline = scheduled_at + due_in_days (ưu tiên theo thời điểm phải làm)
                        Integer due = freshChecklist.getDueInDays();
                        if (due != null && due > 0) {
                            d.setDeadlineAt(nextOccurrence.plusDays(due));
                        }
                        detailRepository.save(d);
                        // Enqueue mail for the newly created checklist detail
                        try { mailChecklistService.queueChecklistDetailMail(d); } catch (Exception ignore) {}
                        log.info("Generated checklist detail: checklist={}, implementer={}, scheduledAt={}", freshChecklist.getId(), imp, nextOccurrence);
                    }

                    nextOccurrence = computeNextOccurrence(nextOccurrence, freshChecklist.getRepeatId());
                }
            }
        } catch (Exception ex) {
            log.error("ChecklistDetailScheduler error: {}", ex.getMessage(), ex);
        }
    }

    private LocalDateTime computeNextOccurrence(LocalDateTime base, Long repeatId) {
        if (repeatId == null) return base; // nếu không có lặp, tạo một lần duy nhất tại startAt
        TimeRepeatChecklist r = repeatRepository.findById(repeatId).orElse(null);
        if (r == null || r.getNumber() == null || r.getUnit() == null) return base;
        int n = Math.max(1, r.getNumber());
        String unit = r.getUnit().toLowerCase();
        switch (unit) {
            case "day":
                return base.plusDays(n);
            case "week":
                return base.plusWeeks(n);
            case "month":
                return base.plusMonths(n);
            case "year":
                return base.plusYears(n);
            default:
                return base;
        }
    }
}