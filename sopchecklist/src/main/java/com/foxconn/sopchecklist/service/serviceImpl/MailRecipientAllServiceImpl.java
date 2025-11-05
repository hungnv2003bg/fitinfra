package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.entity.TypeMailRecipient;
import com.foxconn.sopchecklist.repository.MailRecipientAllRepository;
import com.foxconn.sopchecklist.service.MailRecipientAllService;
import com.foxconn.sopchecklist.service.TimeService;
import com.foxconn.sopchecklist.service.TypeMailRecipientService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MailRecipientAllServiceImpl implements MailRecipientAllService {

    private final MailRecipientAllRepository repository;
    private final TimeService timeService;
    private final TypeMailRecipientService typeMailRecipientService;

    public MailRecipientAllServiceImpl(MailRecipientAllRepository repository, 
                                                   TimeService timeService,
                                                   TypeMailRecipientService typeMailRecipientService) {
        this.repository = repository;
        this.timeService = timeService;
        this.typeMailRecipientService = typeMailRecipientService;
    }

    @Override
    public MailRecipientAll add(MailRecipientAll r) {
        if (r.getCreatedAt() == null) {
            r.setCreatedAt(timeService.nowVietnam());
        }
        if (r.getUpdatedAt() == null) {
            r.setUpdatedAt(timeService.nowVietnam());
        }
        return repository.save(r);
    }

    @Override
    public MailRecipientAll update(Long id, MailRecipientAll r) {
        MailRecipientAll existing = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Not found"));
        existing.setEmail(r.getEmail());
        existing.setType(r.getType());
        // Only update TypeMailRecipient if it's provided
        if (r.getTypeMailRecipient() != null) {
            existing.setTypeMailRecipient(r.getTypeMailRecipient());
        }
        existing.setEnabled(r.getEnabled());
        existing.setNote(r.getNote());
        existing.setUpdatedAt(timeService.nowVietnam());
        return repository.save(existing);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Override
    public List<MailRecipientAll> listAll() { 
        try {
            System.out.println("DEBUG: MailRecipientAllServiceImpl.listAll() called");
            List<MailRecipientAll> result = repository.findAll();
            System.out.println("DEBUG: Repository returned " + result.size() + " recipients");
            return result;
        } catch (Exception e) {
            System.err.println("ERROR in MailRecipientAllServiceImpl.listAll(): " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @Override
    public List<MailRecipientAll> listEnabled() { return repository.findByEnabledTrue(); }

    @Override
    public List<MailRecipientAll> findByTypeAndEnabledTrue(String type) { 
        return repository.findByTypeAndEnabledTrue(type); 
    }

    @Override
    public List<MailRecipientAll> findByTypeMailRecipientTypeNameAndEnabledTrue(String typeName) {
        System.out.println("DEBUG: Searching for typeName: " + typeName);
        List<MailRecipientAll> result = repository.findByTypeMailRecipientTypeNameAndEnabledTrue(typeName);
        System.out.println("DEBUG: Repository returned " + result.size() + " results");
        return result;
    }

    @Override
    public void replaceAll(String mailToCsv, String mailCcCsv, String mailBccCsv) {
        // simple approach: clear and insert
        repository.deleteAll();

        java.util.function.BiConsumer<String, String> addAll = (csv, type) -> {
            if (csv == null || csv.trim().isEmpty()) return;
            
            // Tìm hoặc tạo TypeMailRecipient cho checklistdone
            TypeMailRecipient typeMailRecipient = typeMailRecipientService.findByTypeName("checklistdone");
            if (typeMailRecipient == null) {
                typeMailRecipient = new TypeMailRecipient();
                typeMailRecipient.setTypeName("checklistdone");
                typeMailRecipient.setDescription("Mail thông báo hoàn thành checklist");
                typeMailRecipient.setEnabled(true);
                typeMailRecipient = typeMailRecipientService.add(typeMailRecipient);
            }
            
            for (String raw : csv.split(",")) {
                String email = raw.trim();
                if (email.isEmpty()) continue;
                MailRecipientAll r = new MailRecipientAll();
                r.setEmail(email);
                r.setType(type); // TO, CC, BCC
                r.setTypeMailRecipient(typeMailRecipient); // checklistdone
                r.setEnabled(true);
                r.setCreatedAt(timeService.nowVietnam());
                r.setUpdatedAt(timeService.nowVietnam());
                repository.save(r);
            }
        };

        addAll.accept(mailToCsv, "TO");
        addAll.accept(mailCcCsv, "CC");
        addAll.accept(mailBccCsv, "BCC");
    }

    @Override
    public void replaceAllByEventType(String eventTypeName, String mailToCsv, String mailCcCsv, String mailBccCsv) {
        // Xóa tất cả người nhận của event type này
        List<MailRecipientAll> existingRecipients = repository.findByTypeMailRecipientTypeNameAndEnabledTrue(eventTypeName);
        repository.deleteAll(existingRecipients);

        java.util.function.BiConsumer<String, String> addAll = (csv, type) -> {
            if (csv == null || csv.trim().isEmpty()) return;
            
            // Tìm hoặc tạo TypeMailRecipient cho event type
            TypeMailRecipient typeMailRecipient = typeMailRecipientService.findByTypeName(eventTypeName);
            if (typeMailRecipient == null) {
                typeMailRecipient = new TypeMailRecipient();
                typeMailRecipient.setTypeName(eventTypeName);
                typeMailRecipient.setDescription("Mail thông báo cho " + eventTypeName);
                typeMailRecipient.setEnabled(true);
                typeMailRecipient = typeMailRecipientService.add(typeMailRecipient);
            }
            
            for (String raw : csv.split(",")) {
                String email = raw.trim();
                if (email.isEmpty()) continue;
                MailRecipientAll r = new MailRecipientAll();
                r.setEmail(email);
                r.setType(type); // TO, CC, BCC
                r.setTypeMailRecipient(typeMailRecipient);
                r.setEnabled(true);
                r.setCreatedAt(timeService.nowVietnam());
                r.setUpdatedAt(timeService.nowVietnam());
                repository.save(r);
            }
        };

        addAll.accept(mailToCsv, "TO");
        addAll.accept(mailCcCsv, "CC");
        addAll.accept(mailBccCsv, "BCC");
    }
}
