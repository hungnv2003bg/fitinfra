package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.Checklists;
import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.entity.TypeMailRecipient;
import com.foxconn.sopchecklist.repository.ChecklistsRepository;
import com.foxconn.sopchecklist.repository.MailRecipientAllRepository;
import com.foxconn.sopchecklist.repository.TypeMailRecipientRepository;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.stream.Collectors;
import com.foxconn.sopchecklist.dto.MailRecipientDTO;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/checklist-mail-recipients")
@CrossOrigin
public class ChecklistMailRecipientController {

    private final MailRecipientAllRepository mailRecipientRepository;
    private final ChecklistsRepository checklistsRepository;
    private final TypeMailRecipientRepository typeMailRecipientRepository;
    private final TimeService timeService;

    public ChecklistMailRecipientController(MailRecipientAllRepository mailRecipientRepository,
                                          ChecklistsRepository checklistsRepository,
                                          TypeMailRecipientRepository typeMailRecipientRepository,
                                          TimeService timeService) {
        this.mailRecipientRepository = mailRecipientRepository;
        this.checklistsRepository = checklistsRepository;
        this.typeMailRecipientRepository = typeMailRecipientRepository;
        this.timeService = timeService;
    }

    /**
     * Lấy danh sách mail recipients theo checklist ID
     */
    @GetMapping("/checklist/{checklistId}")
    public ResponseEntity<List<MailRecipientDTO>> getByChecklist(@PathVariable Long checklistId) {
        try {
            System.out.println("DEBUG: getByChecklist called with checklistId=" + checklistId);
            // Chỉ lấy recipients thuộc nhóm CHECKLIST và đang bật
            List<MailRecipientAll> recipients = mailRecipientRepository
                    .findByChecklistIdAndTypeMailRecipientTypeNameAndEnabledTrue(checklistId, "CHECKLIST");
            System.out.println("DEBUG: getByChecklist primary returned size=" + (recipients != null ? recipients.size() : -1));
            return ResponseEntity.ok(toDto(recipients));
        } catch (Exception e) {
            System.err.println("WARN: primary query failed in getByChecklist: " + e.getMessage());
            try {
                // Fallback: không join theo typeName (phòng khi lỗi mapping), vẫn lọc theo checklist_id và enabled
                List<MailRecipientAll> recipients = mailRecipientRepository.findByChecklistIdAndEnabledTrue(checklistId);
                System.out.println("DEBUG: getByChecklist fallback returned size=" + (recipients != null ? recipients.size() : -1));
                return ResponseEntity.ok(toDto(recipients));
            } catch (Exception ignored) {
                // Tránh 500 khi xảy ra lỗi truy vấn, trả về danh sách rỗng để UI vẫn hoạt động
                System.err.println("ERROR: fallback query failed in getByChecklist");
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }
        }
    }

    /**
     * Lấy danh sách mail recipients theo checklist ID và type (TO, CC, BCC)
     */
    @GetMapping("/checklist/{checklistId}/type/{type}")
    public ResponseEntity<List<MailRecipientDTO>> getByChecklistAndType(@PathVariable Long checklistId, @PathVariable String type) {
        try {
            System.out.println("DEBUG: getByChecklistAndType called with checklistId=" + checklistId + ", type=" + type);
            // Lọc theo type (TO/CC/BCC) + nhóm CHECKLIST
            List<MailRecipientAll> recipients = mailRecipientRepository
                    .findByChecklistIdAndTypeAndTypeMailRecipientTypeNameAndEnabledTrue(checklistId, type, "CHECKLIST");
            System.out.println("DEBUG: getByChecklistAndType primary returned size=" + (recipients != null ? recipients.size() : -1));
            return ResponseEntity.ok(toDto(recipients));
        } catch (Exception e) {
            System.err.println("WARN: primary query failed in getByChecklistAndType: " + e.getMessage());
            try {
                // Fallback: lọc theo checklistId + type nếu join typeName gặp lỗi
                List<MailRecipientAll> recipients = mailRecipientRepository
                        .findByChecklistIdAndTypeAndEnabledTrue(checklistId, type);
                System.out.println("DEBUG: getByChecklistAndType fallback returned size=" + (recipients != null ? recipients.size() : -1));
                return ResponseEntity.ok(toDto(recipients));
            } catch (Exception ignored) {
                System.err.println("ERROR: fallback query failed in getByChecklistAndType");
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }
        }
    }

    private List<MailRecipientDTO> toDto(List<MailRecipientAll> list) {
        if (list == null) return java.util.Collections.emptyList();
        return list.stream().map(m -> {
            MailRecipientDTO d = new MailRecipientDTO();
            d.setId(m.getId());
            d.setEmail(m.getEmail());
            d.setType(m.getType());
            d.setEnabled(m.getEnabled());
            d.setNote(m.getNote());
            d.setChecklistId(m.getChecklistId());
            return d;
        }).collect(Collectors.toList());
    }

    /**
     * Thêm mail recipient cho checklist
     */
    @PostMapping
    public ResponseEntity<MailRecipientAll> add(@RequestBody Map<String, Object> request) {
        try {
            Long checklistId = Long.valueOf(request.get("checklistId").toString());
            String email = request.get("email").toString();
            String type = request.get("type").toString(); // TO, CC, BCC
            String note = request.getOrDefault("note", "").toString();

            // Kiểm tra checklist tồn tại
            Checklists checklist = checklistsRepository.findById(checklistId).orElse(null);
            if (checklist == null) {
                return ResponseEntity.badRequest().build();
            }

            // Tìm hoặc tạo TypeMailRecipient cho CHECKLIST
            TypeMailRecipient typeMailRecipient = typeMailRecipientRepository.findByTypeName("CHECKLIST").orElse(null);
            if (typeMailRecipient == null) {
                typeMailRecipient = new TypeMailRecipient();
                typeMailRecipient.setTypeName("CHECKLIST");
                typeMailRecipient.setDescription("Mail recipients for checklist");
                typeMailRecipient.setEnabled(true);
                typeMailRecipient.setCreatedAt(timeService.nowVietnam());
                typeMailRecipient.setUpdatedAt(timeService.nowVietnam());
                typeMailRecipient = typeMailRecipientRepository.save(typeMailRecipient);
            }

            // Kiểm tra email đã tồn tại chưa
            List<MailRecipientAll> existing = mailRecipientRepository.findByChecklistIdAndTypeAndTypeMailRecipientTypeNameAndEnabledTrue(
                checklistId, type, "CHECKLIST");
            boolean emailExists = existing.stream().anyMatch(r -> r.getEmail().equalsIgnoreCase(email));
            if (emailExists) {
                return ResponseEntity.badRequest().build();
            }

            MailRecipientAll recipient = new MailRecipientAll();
            recipient.setEmail(email);
            recipient.setType(type);
            recipient.setTypeMailRecipient(typeMailRecipient);
            recipient.setChecklistId(checklistId);
            recipient.setEnabled(true);
            recipient.setNote(note);
            recipient.setCreatedAt(timeService.nowVietnam());
            recipient.setUpdatedAt(timeService.nowVietnam());

            MailRecipientAll saved = mailRecipientRepository.save(recipient);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Cập nhật mail recipient
     */
    @PutMapping("/{id}")
    public ResponseEntity<MailRecipientAll> update(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        MailRecipientAll recipient = mailRecipientRepository.findById(id).orElse(null);
        if (recipient == null) {
            return ResponseEntity.notFound().build();
        }
        
        try {
            String email = request.get("email").toString();
            String type = request.get("type").toString();
            String note = request.getOrDefault("note", "").toString();

            recipient.setEmail(email);
            recipient.setType(type);
            recipient.setNote(note);
            recipient.setUpdatedAt(timeService.nowVietnam());

            MailRecipientAll saved = mailRecipientRepository.save(recipient);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Xóa mail recipient
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (mailRecipientRepository.existsById(id)) {
            mailRecipientRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Toggle enabled/disabled cho mail recipient
     */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<MailRecipientAll> toggleEnabled(@PathVariable Long id) {
        return mailRecipientRepository.findById(id).map(recipient -> {
            recipient.setEnabled(!recipient.getEnabled());
            recipient.setUpdatedAt(timeService.nowVietnam());
            MailRecipientAll saved = mailRecipientRepository.save(recipient);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }
}
