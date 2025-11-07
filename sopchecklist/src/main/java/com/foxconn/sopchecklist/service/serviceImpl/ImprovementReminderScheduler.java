package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.Improvements;
import com.foxconn.sopchecklist.entity.TypeCronMail;
import com.foxconn.sopchecklist.repository.ImprovementsRepository;
import com.foxconn.sopchecklist.repository.TypeCronMailRepository;
import com.foxconn.sopchecklist.repository.CronMailAllRepository;
import com.foxconn.sopchecklist.service.MailImprovementReminderService;
import com.foxconn.sopchecklist.service.TimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

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

    @Autowired
    private TypeCronMailRepository typeCronMailRepository;

    @Autowired
    private CronMailAllRepository cronMailAllRepository;

    // Chạy mỗi 1 phút (để test) - TODO: Đổi lại thành mỗi ngày lúc 8:00 sáng sau khi test xong
    // Cron pattern cũ: "0 0 8 * * ?" (8:00 sáng mỗi ngày)
    @Scheduled(cron = "0 */1 * * * ?", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void checkAndSendReminders() {
        LocalDateTime now = timeService.nowVietnam();
        log.info("=== ImprovementReminderScheduler: Starting reminder check at {} ===", now);
        
        try {
            // Lấy typeId của IMPROVEMENT_REMINDER để kiểm tra mail đã gửi
            TypeCronMail reminderType = typeCronMailRepository.findByTypeName("IMPROVEMENT_REMINDER");
            Long reminderTypeId = reminderType != null ? reminderType.getId() : null;
            
            if (reminderTypeId == null) {
                log.warn("ImprovementReminderScheduler: IMPROVEMENT_REMINDER type not found, will create on first send");
            }
            
            // Lấy tất cả improvement chưa hoàn thành
            List<Improvements> allImprovements = improvementsRepository.findAll();
            log.info("Found {} total improvements in database", allImprovements.size());
            
            int reminderCount = 0;
            int skippedCount = 0;
            for (Improvements improvement : allImprovements) {
                Integer improvementId = improvement.getImprovementID();
                String category = improvement.getCategory();
                
                // Kiểm tra điều kiện:
                // 1. Có plannedDueAt (thời gian dự kiến hoàn thành)
                if (improvement.getPlannedDueAt() == null) {
                    log.debug("Skip improvement ID {}: No plannedDueAt", improvementId);
                    skippedCount++;
                    continue;
                }
                
                LocalDateTime plannedDueAt = improvement.getPlannedDueAt();
                // 2. plannedDueAt đã qua (<= hiện tại)
                if (plannedDueAt.isAfter(now)) {
                    log.debug("Skip improvement ID {}: Not yet due (plannedDueAt: {}, now: {})", 
                            improvementId, plannedDueAt, now);
                    skippedCount++;
                    continue; // Chưa đến hạn
                }
                
                // 3. Status không phải DONE hoặc COMPLETED
                String status = improvement.getStatus();
                if (status != null) {
                    String statusUpper = status.toUpperCase();
                    if (statusUpper.equals("DONE") || statusUpper.equals("COMPLETED") || 
                        statusUpper.contains("HOÀN THÀNH") || statusUpper.contains("HOAN THANH")) {
                        log.debug("Skip improvement ID {}: Already completed (status: {})", improvementId, status);
                        skippedCount++;
                        continue; // Đã hoàn thành
                    }
                }
                
                // 4. Có người phụ trách (responsible) hoặc người phối hợp (collaborators)
                boolean hasResponsible = improvement.getResponsible() != null && !improvement.getResponsible().isEmpty();
                boolean hasCollaborators = improvement.getCollaborators() != null && !improvement.getCollaborators().isEmpty();
                if (!hasResponsible && !hasCollaborators) {
                    log.debug("Skip improvement ID {}: No responsible or collaborators", improvementId);
                    skippedCount++;
                    continue; // Không có người phụ trách và cũng không có người phối hợp
                }
                
                // 5. Kiểm tra xem đã gửi reminder cho improvement này chưa
                // Chỉ gửi lại sau 24 giờ để tránh spam
                // Chỉ kiểm tra nếu type đã tồn tại trong database
                boolean shouldSkipDueToRecentSend = false;
                if (reminderTypeId != null) {
                    LocalDateTime twentyFourHoursAgo = now.minusHours(24);
                    List<com.foxconn.sopchecklist.entity.CronMailAll> recentReminders = 
                            cronMailAllRepository.findReminderMailsByTypeIdAndReferenceIdAndCreatedAtAfter(
                                    reminderTypeId, improvementId.longValue(), twentyFourHoursAgo);
                    
                    if (!recentReminders.isEmpty()) {
                        // Đã gửi reminder trong 24 giờ gần đây, bỏ qua để tránh spam
                        shouldSkipDueToRecentSend = true;
                        skippedCount++;
                        log.debug("Skip improvement ID {}: Already sent {} reminder(s) in last 24 hours", 
                                improvementId, recentReminders.size());
                    }
                } else {
                    log.debug("Type IMPROVEMENT_REMINDER not found yet - will be created on first send for improvement ID {}", improvementId);
                }
                
                if (shouldSkipDueToRecentSend) {
                    continue;
                }
                
                // Gửi mail nhắc nhở
                try {
                    log.info(">>> Sending reminder for improvement ID: {}, category: '{}', status: '{}', plannedDueAt: {}", 
                            improvementId, category, status, plannedDueAt);
                    mailReminderService.queueImprovementReminderMail(improvement);
                    reminderCount++;
                    log.info("✓ Successfully queued reminder mail for improvement ID: {}", improvementId);
                } catch (Exception e) {
                    log.error("✗ Failed to queue reminder mail for improvement ID: {} - {}", 
                            improvementId, e.getMessage(), e);
                }
            }
            
            log.info("=== ImprovementReminderScheduler: Completed. Sent {} reminders, skipped {} improvements ===", 
                    reminderCount, skippedCount);
            
        } catch (Exception ex) {
            log.error("ImprovementReminderScheduler error: {}", ex.getMessage(), ex);
        }
    }
}

