    package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.ImprovementProgress;
import com.foxconn.sopchecklist.entity.Improvements;
import com.foxconn.sopchecklist.repository.ImprovementProgressRepository;
import com.foxconn.sopchecklist.repository.ImprovementsRepository;
import com.foxconn.sopchecklist.service.ImprovementProgressService;
import com.foxconn.sopchecklist.service.MailImprovementDoneService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ImprovementProgressServiceImpl implements ImprovementProgressService {

    private final ImprovementProgressRepository progressRepository;
    private final ImprovementsRepository improvementsRepository;
    private final MailImprovementDoneService mailImprovementDoneService;
    private final TimeService timeService;

    public ImprovementProgressServiceImpl(ImprovementProgressRepository progressRepository,
                                          ImprovementsRepository improvementsRepository,
                                          MailImprovementDoneService mailImprovementDoneService,
                                          TimeService timeService) {
        this.progressRepository = progressRepository;
        this.improvementsRepository = improvementsRepository;
        this.mailImprovementDoneService = mailImprovementDoneService;
        this.timeService = timeService;
    }

    private void updateImprovementProgressSummary(Integer improvementId) {
        Improvements improvement = improvementsRepository.findById(improvementId).orElse(null);
        if (improvement == null) return;
        
        // Track old status before update
        String oldStatus = improvement.getStatus();
        boolean wasNotDone = oldStatus == null || (!oldStatus.equals("DONE") && !oldStatus.equals("COMPLETED"));
        
        List<ImprovementProgress> progressList = progressRepository.findByImprovement_ImprovementIDOrderByCreatedAtDesc(improvementId);
        if (progressList.isEmpty()) {
            improvement.setStatus("PENDING");
            improvement.setProgress(0);
            // Ensure completedAt is cleared when no progress remains
            improvement.setCompletedAt(null);
            improvementsRepository.save(improvement);
            return;
        }
        // Tính tổng progress chỉ từ các entry có status = 2 (Hoàn thành)
        int total = progressList.stream()
            .filter(p -> p.getStatus() != null && p.getStatus() == 2)
            .mapToInt(p -> p.getProgressPercent() != null ? p.getProgressPercent() : 0)
            .sum();
        if (total > 100) total = 100;
        improvement.setProgress(total);
        
        // Sửa logic trạng thái:
        // - Nếu tổng >= 100 => DONE
        // - Nếu đã có bất kỳ bản ghi tiến độ nào (status 0/1/2) nhưng tổng < 100 => IN_PROGRESS
        // - Nếu chưa có bản ghi nào => PENDING (đã xử lý ở nhánh isEmpty phía trên)
        boolean hasAnyProgressRecord = !progressList.isEmpty();
        boolean becameDone = false;
        boolean wasDone = oldStatus != null && (oldStatus.equals("DONE") || oldStatus.equals("COMPLETED"));
        
        if (total >= 100) {
            improvement.setStatus("DONE");
            becameDone = true;
            // Set completedAt when status becomes DONE
            if (improvement.getCompletedAt() == null) {
                improvement.setCompletedAt(timeService.nowVietnam());
            }
        } else if (hasAnyProgressRecord) {
            improvement.setStatus("IN_PROGRESS");
            // Luôn xóa completedAt khi tổng tiến độ < 100%
            improvement.setCompletedAt(null);
        } else {
            improvement.setStatus("PENDING");
            // Luôn xóa completedAt khi không còn tiến độ
            improvement.setCompletedAt(null);
        }
        Improvements saved = improvementsRepository.save(improvement);
        
        // Gửi mail thông báo hoàn thành nếu status chuyển từ không phải DONE/COMPLETED sang DONE
        // Chỉ gửi khi: (1) Trước đó chưa phải DONE và (2) Bây giờ trở thành DONE (progress >= 100%)
        if (wasNotDone && becameDone && saved.getStatus() != null && saved.getStatus().equals("DONE")) {
            try {
                System.out.println("Improvement completed! ID: " + saved.getImprovementID() + 
                                 ", Progress: " + total + "%, Status: " + saved.getStatus());
                System.out.println("Sending completion email for improvement ID: " + saved.getImprovementID());
                mailImprovementDoneService.queueImprovementDoneMail(saved);
            } catch (Exception e) {
                System.err.println("Failed to queue improvement done mail for improvement " + saved.getImprovementID() + ": " + e.getMessage());
                e.printStackTrace();
            }
        } else {
            System.out.println("Mail not sent - wasNotDone: " + wasNotDone + ", becameDone: " + becameDone + 
                             ", status: " + saved.getStatus() + ", progress: " + total + "%, improvement ID: " + saved.getImprovementID());
        }
    }

    @Override
    public ImprovementProgress create(Integer improvementId, Integer percent, String detail, Integer status, Integer createdBy) {
        Improvements improvement = improvementsRepository.findById(improvementId).orElseThrow();
        ImprovementProgress progress = new ImprovementProgress();
        progress.setImprovement(improvement);
        progress.setProgressPercent(percent);
        progress.setProgressDetail(detail);
        progress.setStatus(status);
        progress.setCreatedBy(createdBy);
        ImprovementProgress result = progressRepository.save(progress);
        updateImprovementProgressSummary(improvementId);
        return result;
    }

    @Override
    public ImprovementProgress update(Long progressId, Integer percent, String detail, Integer status, Integer updatedBy) {
        ImprovementProgress existed = progressRepository.findById(progressId).orElseThrow();
        if (percent != null) existed.setProgressPercent(percent);
        if (detail != null) existed.setProgressDetail(detail);
        if (status != null) existed.setStatus(status);
        existed.setUpdatedBy(updatedBy);
        existed.setUpdatedAt(java.time.LocalDateTime.now());
        ImprovementProgress result = progressRepository.save(existed);
        if (existed.getImprovement() != null && existed.getImprovement().getImprovementID() != null) {
            updateImprovementProgressSummary(existed.getImprovement().getImprovementID());
        }
        return result;
    }

    @Override
    public void delete(Long progressId) {
        ImprovementProgress existed = progressRepository.findById(progressId).orElse(null);
        Integer improvementId = (existed != null && existed.getImprovement() != null) ? existed.getImprovement().getImprovementID() : null;
        progressRepository.deleteById(progressId);
        if (improvementId != null) {
            updateImprovementProgressSummary(improvementId);
        }
    }

    @Override
    public List<ImprovementProgress> listByImprovement(Integer improvementId) {
        return progressRepository.findByImprovement_ImprovementIDOrderByCreatedAtDesc(improvementId);
    }
}


