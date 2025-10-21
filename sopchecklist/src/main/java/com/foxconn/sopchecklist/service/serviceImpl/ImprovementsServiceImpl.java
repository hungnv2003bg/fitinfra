package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.entity.Improvements;
import com.foxconn.sopchecklist.repository.ImprovementsRepository;
import com.foxconn.sopchecklist.service.ImprovementsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ImprovementsServiceImpl implements ImprovementsService {

    @Autowired
    private ImprovementsRepository improvementsRepository;

    @Override
    public Improvements findById(Integer id) {
        return improvementsRepository.findById(id).orElse(null);
    }

    @Override
    public Improvements save(Improvements improvement) {
        return improvementsRepository.save(improvement);
    }

    @Override
    public Improvements update(Improvements improvement) {
        return improvementsRepository.save(improvement);
    }

    @Override
    public void delete(Integer id) {
        improvementsRepository.deleteById(id);
    }

    @Override
    public List<Improvements> findAll() {
        return improvementsRepository.findAll();
    }
}


