package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.MailRecipient;
import com.foxconn.sopchecklist.repository.MailRecipientRepository;
import com.foxconn.sopchecklist.service.MailRecipientService;
import com.foxconn.sopchecklist.service.TimeService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MailRecipientServiceImpl implements MailRecipientService {

    private final MailRecipientRepository repository;
    private final TimeService timeService;

    public MailRecipientServiceImpl(MailRecipientRepository repository, TimeService timeService) {
        this.repository = repository;
        this.timeService = timeService;
    }

    @Override
    public MailRecipient add(MailRecipient r) {
        if (r.getEmail() == null || r.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (r.getType() == null || r.getType().trim().isEmpty()) {
            throw new IllegalArgumentException("Type is required");
        }
        if (repository.existsByEmailIgnoreCaseAndType(r.getEmail().trim(), r.getType().trim())) {
            throw new IllegalArgumentException("Email already exists for type");
        }
        r.setEnabled(r.getEnabled() == null ? true : r.getEnabled());
        r.setCreatedAt(timeService.nowVietnam());
        r.setUpdatedAt(timeService.nowVietnam());
        return repository.save(r);
    }

    @Override
    public MailRecipient update(Long id, MailRecipient r) {
        MailRecipient existing = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Not found"));
        if (r.getEmail() != null) existing.setEmail(r.getEmail());
        if (r.getType() != null) existing.setType(r.getType());
        if (r.getEnabled() != null) existing.setEnabled(r.getEnabled());
        if (r.getNote() != null) existing.setNote(r.getNote());
        existing.setUpdatedAt(timeService.nowVietnam());
        return repository.save(existing);
    }

    @Override
    public void delete(Long id) { repository.deleteById(id); }

    @Override
    public List<MailRecipient> listAll() { return repository.findAll(); }

    @Override
    public List<MailRecipient> listEnabled() { return repository.findByEnabledTrue(); }

    @Override
    public void replaceAll(String mailToCsv, String mailCcCsv, String mailBccCsv) {
        // simple approach: clear and insert
        repository.deleteAll();

        java.util.function.BiConsumer<String, String> addAll = (csv, type) -> {
            if (csv == null || csv.trim().isEmpty()) return;
            for (String raw : csv.split(",")) {
                String email = raw.trim();
                if (email.isEmpty()) continue;
                MailRecipient r = new MailRecipient();
                r.setEmail(email);
                r.setType(type);
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


