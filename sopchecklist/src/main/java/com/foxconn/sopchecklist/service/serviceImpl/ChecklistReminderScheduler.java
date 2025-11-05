package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.ChecklistDetail;
import com.foxconn.sopchecklist.entity.TypeCronMail;
import com.foxconn.sopchecklist.repository.ChecklistDetailRepository;
import com.foxconn.sopchecklist.repository.TypeCronMailRepository;
import com.foxconn.sopchecklist.repository.CronMailAllRepository;
import com.foxconn.sopchecklist.service.MailChecklistService;
import com.foxconn.sopchecklist.service.TimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler để kiểm tra và gửi mail nhắc nhở các checklist detail đã đến deadline
 * nhưng chưa ở trạng thái hoàn thành
 */
@Component
public class ChecklistReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ChecklistReminderScheduler.class);

    @Autowired
    private ChecklistDetailRepository checklistDetailRepository;

    @Autowired
    private MailChecklistService mailChecklistService;

    @Autowired
    private TimeService timeService;

    @Autowired
    private TypeCronMailRepository typeCronMailRepository;

    @Autowired
    private CronMailAllRepository cronMailAllRepository;

    // Chạy mỗi phút để kiểm tra checklist detail đến deadline
    @Scheduled(cron = "0 * * * * ?", zone = "Asia/Ho_Chi_Minh")
    public void checkAndSendReminders() {
        LocalDateTime now = timeService.nowVietnam();
        log.info("ChecklistReminderScheduler: Checking for overdue checklist details at {}", now);
        
        try {
            // Lấy typeId của CHECKLIST để kiểm tra mail đã gửi
            TypeCronMail checklistType = typeCronMailRepository.findByTypeName("CHECKLIST");
            Long checklistTypeId = checklistType != null ? checklistType.getId() : null;
            
            if (checklistTypeId == null) {
                log.warn("ChecklistReminderScheduler: CHECKLIST type not found in TypeCronMail, skipping reminder check");
                return;
            }
            
            // Lấy tất cả checklist detail đã đến deadline nhưng chưa hoàn thành
            List<ChecklistDetail> overdueDetails = checklistDetailRepository
                    .findByDeadlineAtBeforeOrEqualAndStatusNotCompleted(now);
            
            log.info("ChecklistReminderScheduler: Found {} overdue checklist details", overdueDetails.size());
            
            if (overdueDetails.isEmpty()) {
                log.info("ChecklistReminderScheduler: No overdue checklist details found. Query conditions: deadlineAt <= {}, status NOT IN ('COMPLETED', 'DONE')", now);
            }
            
            int reminderCount = 0;
            int skippedCount = 0;
            
            for (ChecklistDetail detail : overdueDetails) {
                log.debug("Processing checklist detail ID: {}, taskName: {}, deadline: {}, status: {}, implementer: {}", 
                    detail.getId(), detail.getTaskName(), detail.getDeadlineAt(), detail.getStatus(), detail.getImplementer());
                
                // Kiểm tra điều kiện:
                // 1. Có deadline
                // 2. deadline đã qua (<= hiện tại)
                // 3. Status không phải COMPLETED hoặc DONE
                // 4. Có implementer (người thực hiện)
                
                if (detail.getDeadlineAt() == null) {
                    log.debug("Skipping checklist detail ID: {} - no deadline", detail.getId());
                    continue;
                }
                
                LocalDateTime deadline = detail.getDeadlineAt();
                if (deadline.isAfter(now)) {
                    log.debug("Skipping checklist detail ID: {} - deadline not yet reached (deadline: {}, now: {})", 
                        detail.getId(), deadline, now);
                    continue; // Chưa đến hạn
                }
                
                String status = detail.getStatus();
                if (status != null && (status.equals("COMPLETED") || status.equals("DONE"))) {
                    log.debug("Skipping checklist detail ID: {} - already completed (status: {})", detail.getId(), status);
                    continue; // Đã hoàn thành
                }
                
                if (detail.getImplementer() == null || detail.getImplementer().trim().isEmpty()) {
                    log.debug("Skipping checklist detail ID: {} - no implementer", detail.getId());
                    continue; // Không có người thực hiện
                }
                
                // Kiểm tra xem đã gửi reminder cho checklist detail này chưa
                // Chỉ gửi lại sau 24 giờ để tránh spam
                LocalDateTime twentyFourHoursAgo = now.minusHours(24);
                List<com.foxconn.sopchecklist.entity.CronMailAll> recentReminders = 
                        cronMailAllRepository.findReminderMailsByTypeIdAndReferenceIdAndCreatedAtAfter(
                                checklistTypeId, detail.getId(), twentyFourHoursAgo);
                
                if (!recentReminders.isEmpty()) {
                    // Đã gửi reminder trong 24 giờ gần đây, bỏ qua để tránh spam
                    skippedCount++;
                    log.debug("Skipping reminder for checklist detail ID: {} (already sent {} reminder(s) in last 24 hours)", 
                            detail.getId(), recentReminders.size());
                    continue;
                }
                
                // Gửi mail nhắc nhở khi deadline đã qua và chưa gửi trong 24h gần đây
                try {
                    mailChecklistService.queueChecklistReminderMail(detail);
                    reminderCount++;
                    log.info("Queued reminder mail for checklist detail ID: {}, taskName: {}, deadline: {}", 
                            detail.getId(), detail.getTaskName(), deadline);
                } catch (Exception e) {
                    log.error("Failed to queue reminder mail for checklist detail ID: {} - {}", 
                            detail.getId(), e.getMessage());
                }
            }
            
            log.info("ChecklistReminderScheduler: Queued {} reminder emails, skipped {} (no deadline/no implementer/already completed)", 
                    reminderCount, skippedCount);
            
        } catch (Exception ex) {
            log.error("ChecklistReminderScheduler error: {}", ex.getMessage(), ex);
        }
    }
}

