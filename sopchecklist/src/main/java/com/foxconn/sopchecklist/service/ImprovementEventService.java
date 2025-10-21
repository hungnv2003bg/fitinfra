package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.dto.ImprovementEventDTO;

import java.util.List;

public interface ImprovementEventService {
    
    // Lấy tất cả events
    List<ImprovementEventDTO> getAllEvents();
    
    // Lấy event theo ID
    ImprovementEventDTO getEventById(Long id);
    
    // Tạo event mới
    ImprovementEventDTO createEvent(ImprovementEventDTO eventDTO);
    
    // Cập nhật event
    ImprovementEventDTO updateEvent(Long id, ImprovementEventDTO eventDTO);
    
    // Xóa event
    boolean deleteEvent(Long id);
}
