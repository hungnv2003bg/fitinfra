package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.ImprovementProgress;

import java.util.List;

public interface ImprovementProgressService {
    ImprovementProgress create(Integer improvementId, Integer percent, String detail, Integer status, Integer createdBy);
    ImprovementProgress update(Long progressId, Integer percent, String detail, Integer status, Integer updatedBy);
    void delete(Long progressId);
    List<ImprovementProgress> listByImprovement(Integer improvementId);
}


