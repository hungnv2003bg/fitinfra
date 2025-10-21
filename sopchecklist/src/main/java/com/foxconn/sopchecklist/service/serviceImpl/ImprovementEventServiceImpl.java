package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.dto.ImprovementEventDTO;
import com.foxconn.sopchecklist.entity.ImprovementEvent;
import com.foxconn.sopchecklist.repository.ImprovementEventRepository;
import com.foxconn.sopchecklist.service.ImprovementEventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class ImprovementEventServiceImpl implements ImprovementEventService {

    @Autowired
    private ImprovementEventRepository improvementEventRepository;

    @Override
    public List<ImprovementEventDTO> getAllEvents() {
        List<ImprovementEvent> events = improvementEventRepository.findAll();
        return events.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ImprovementEventDTO getEventById(Long id) {
        Optional<ImprovementEvent> event = improvementEventRepository.findById(id);
        return event.map(this::convertToDTO).orElse(null);
    }

    @Override
    public ImprovementEventDTO createEvent(ImprovementEventDTO eventDTO) {
        ImprovementEvent event = new ImprovementEvent();
        event.setEventName(eventDTO.getEventName());

        ImprovementEvent savedEvent = improvementEventRepository.save(event);
        return convertToDTO(savedEvent);
    }

    @Override
    public ImprovementEventDTO updateEvent(Long id, ImprovementEventDTO eventDTO) {
        Optional<ImprovementEvent> eventOpt = improvementEventRepository.findById(id);
        if (eventOpt.isPresent()) {
            ImprovementEvent event = eventOpt.get();
            event.setEventName(eventDTO.getEventName());
            
            ImprovementEvent savedEvent = improvementEventRepository.save(event);
            return convertToDTO(savedEvent);
        }
        return null;
    }

    @Override
    public boolean deleteEvent(Long id) {
        Optional<ImprovementEvent> eventOpt = improvementEventRepository.findById(id);
        if (eventOpt.isPresent()) {
            improvementEventRepository.delete(eventOpt.get());
            return true;
        }
        return false;
    }

    private ImprovementEventDTO convertToDTO(ImprovementEvent event) {
        ImprovementEventDTO dto = new ImprovementEventDTO();
        dto.setId(event.getId());
        dto.setEventName(event.getEventName());
        return dto;
    }
}
