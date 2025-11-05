package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.entity.TypeMailRecipient;
import com.foxconn.sopchecklist.repository.MailRecipientAllRepository;
import com.foxconn.sopchecklist.service.MailRecipientService;
import com.foxconn.sopchecklist.service.TimeService;
import com.foxconn.sopchecklist.service.TypeMailRecipientService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MailRecipientServiceImpl implements MailRecipientService {

    private final MailRecipientAllRepository repository;
    private final TypeMailRecipientService typeMailRecipientService;
    private final TimeService timeService;

    public MailRecipientServiceImpl(MailRecipientAllRepository repository,
                                    TypeMailRecipientService typeMailRecipientService,
                                    TimeService timeService) {
        this.repository = repository;
        this.typeMailRecipientService = typeMailRecipientService;
        this.timeService = timeService;
    }

    @Override
    public List<String> getRecipientsByEventAndType(String eventType, String mailType) {
        List<MailRecipientAll> recipients = repository.findByTypeAndTypeMailRecipientTypeNameAndEnabledTrue(mailType, eventType);
        return recipients.stream()
                .map(MailRecipientAll::getEmail)
                .filter(e -> e != null && !e.trim().isEmpty())
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getToRecipients(String eventType) {
        return getRecipientsByEventAndType(eventType, "TO");
    }

    @Override
    public List<String> getCcRecipients(String eventType) {
        return getRecipientsByEventAndType(eventType, "CC");
    }

    @Override
    public List<String> getBccRecipients(String eventType) {
        return getRecipientsByEventAndType(eventType, "BCC");
    }

    @Override
    public MailRecipientAll addRecipient(String email, String eventType, String mailType, String note) {
        // Tìm hoặc tạo TypeMailRecipient
        TypeMailRecipient typeMailRecipient = typeMailRecipientService.findByTypeName(eventType);
        if (typeMailRecipient == null) {
            typeMailRecipient = new TypeMailRecipient();
            typeMailRecipient.setTypeName(eventType);
            typeMailRecipient.setDescription("Auto-created event type: " + eventType);
            typeMailRecipient.setEnabled(true);
            typeMailRecipient = typeMailRecipientService.add(typeMailRecipient);
        }

        MailRecipientAll recipient = new MailRecipientAll();
        recipient.setEmail(email);
        recipient.setType(mailType);
        recipient.setTypeMailRecipient(typeMailRecipient);
        recipient.setNote(note);
        recipient.setEnabled(true);
        recipient.setCreatedAt(timeService.nowVietnam());
        recipient.setUpdatedAt(timeService.nowVietnam());

        return repository.save(recipient);
    }

    @Override
    public void clearRecipientsByEvent(String eventType) {
        List<MailRecipientAll> recipients = repository.findByTypeMailRecipientTypeNameAndEnabledTrue(eventType);
        repository.deleteAll(recipients);
    }
}