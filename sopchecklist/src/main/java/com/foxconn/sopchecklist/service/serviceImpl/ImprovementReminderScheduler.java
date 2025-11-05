package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.Improvements;
import com.foxconn.sopchecklist.repository.ImprovementsRepository;
import com.foxconn.sopchecklist.service.MailImprovementReminderService;
import com.foxconn.sopchecklist.service.TimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler để kiểm tra và gửi mail nhắc nhở các improvement đã đến thời gian dự kiến hoàn thành
 * nhưng chưa ở trạng thái hoàn thành
 */
@Component
public class ImprovementReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ImprovementReminderScheduler.class);

    @Autowired
    private ImprovementsRepository improvementsRepository;

    @Autowired
    private MailImprovementReminderService mailReminderService;

    @Autowired
    private TimeService timeService;

    // Chạy mỗi ngày lúc 8:00 sáng (theo múi giờ Vietnam)
    @Scheduled(cron = "0 0 8 * * ?", zone = "Asia/Ho_Chi_Minh")
    public void checkAndSendReminders() {
        LocalDateTime now = timeService.nowVietnam();
        log.info("ImprovementReminderScheduler: Checking for overdue improvements at {}", now);
        
        try {
            // Lấy tất cả improvement chưa hoàn thành
            List<Improvements> allImprovements = improvementsRepository.findAll();
            
            int reminderCount = 0;
            for (Improvements improvement : allImprovements) {
                // Kiểm tra điều kiện:
                // 1. Có plannedDueAt (thời gian dự kiến hoàn thành)
                // 2. plannedDueAt đã qua (<= hiện tại)
                // 3. Status không phải DONE hoặc COMPLETED
                // 4. Có người phụ trách (responsible) hoặc người phối hợp (collaborators)
                
                if (improvement.getPlannedDueAt() == null) {
                    continue;
                }
                
                LocalDateTime plannedDueAt = improvement.getPlannedDueAt();
                if (plannedDueAt.isAfter(now)) {
                    continue; // Chưa đến hạn
                }
                
                String status = improvement.getStatus();
                if (status != null && (status.equals("DONE") || status.equals("COMPLETED"))) {
                    continue; // Đã hoàn thành
                }
                
                // Kiểm tra có người phụ trách hoặc người phối hợp
                boolean hasResponsible = improvement.getResponsible() != null && !improvement.getResponsible().isEmpty();
                boolean hasCollaborators = improvement.getCollaborators() != null && !improvement.getCollaborators().isEmpty();
                if (!hasResponsible && !hasCollaborators) {
                    continue; // Không có người phụ trách và cũng không có người phối hợp
                }
                
                // Gửi mail nhắc nhở
                try {
                    mailReminderService.queueImprovementReminderMail(improvement);
                    reminderCount++;
                    log.info("Queued reminder mail for improvement ID: {}, category: {}, plannedDueAt: {}", 
                            improvement.getImprovementID(), improvement.getCategory(), plannedDueAt);
                } catch (Exception e) {
                    log.error("Failed to queue reminder mail for improvement ID: {} - {}", 
                            improvement.getImprovementID(), e.getMessage());
                }
            }
            
            log.info("ImprovementReminderScheduler: Sent {} reminder emails", reminderCount);
            
        } catch (Exception ex) {
            log.error("ImprovementReminderScheduler error: {}", ex.getMessage(), ex);
        }
    }
}

