package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.Improvements;
import java.util.List;

public interface ImprovementsService {
    Improvements findById(Integer id);
    Improvements save(Improvements improvement);
    Improvements update(Improvements improvement);
    void delete(Integer id);
    List<Improvements> findAll();
}

