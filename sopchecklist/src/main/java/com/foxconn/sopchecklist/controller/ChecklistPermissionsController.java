package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.ChecklistPermission;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.ChecklistPermissionRepository;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/checklists/global")
@CrossOrigin
public class ChecklistPermissionsController {

    private final ChecklistPermissionRepository repo;
    private final UsersService usersService;

    public ChecklistPermissionsController(ChecklistPermissionRepository repo, UsersService usersService) {
        this.repo = repo;
        this.usersService = usersService;
    }

    @GetMapping("/permissions")
    public Map<String, Object> getGlobalPermissions() {
        List<ChecklistPermission> list = repo.findAll();
        Map<String, Object> result = new HashMap<>();
        result.put("groups", list.stream().filter(p -> p.getGroupId() != null).map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("groupId", p.getGroupId());
            m.put("view", p.isView());
            m.put("edit", p.isEdit());
            m.put("del", p.isDel());
            m.put("create", p.isCreate());
            return m;
        }).collect(Collectors.toList()));
        result.put("users", list.stream().filter(p -> p.getUserId() != null).map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("userId", p.getUserId());
            m.put("view", p.isView());
            m.put("edit", p.isEdit());
            m.put("del", p.isDel());
            m.put("create", p.isCreate());
            return m;
        }).collect(Collectors.toList()));
        return result;
    }

    @PostMapping("/permissions")
    public ResponseEntity<?> saveGlobalPermissions(@RequestBody Map<String, List<Map<String, Object>>> payload) {
        repo.deleteAll();
        List<ChecklistPermission> toSave = new ArrayList<>();

        List<Map<String, Object>> groups = payload.getOrDefault("groups", Collections.emptyList());
        for (Map<String, Object> item : groups) {
            Object gid = item.get("groupId");
            if (gid == null) continue;
            boolean view = Boolean.TRUE.equals(item.get("view"));
            boolean edit = Boolean.TRUE.equals(item.get("edit"));
            boolean del = Boolean.TRUE.equals(item.get("del"));
            boolean create = Boolean.TRUE.equals(item.get("create"));
            if (!(view || edit || del || create)) continue;
            ChecklistPermission p = new ChecklistPermission();
            p.setGroupId(((Number) gid).longValue());
            p.setView(view);
            p.setEdit(edit);
            p.setDel(del);
            p.setCreate(create);
            toSave.add(p);
        }

        List<Map<String, Object>> users = payload.getOrDefault("users", Collections.emptyList());
        for (Map<String, Object> item : users) {
            Object uid = item.get("userId");
            if (uid == null) continue;
            boolean view = Boolean.TRUE.equals(item.get("view"));
            boolean edit = Boolean.TRUE.equals(item.get("edit"));
            boolean del = Boolean.TRUE.equals(item.get("del"));
            boolean create = Boolean.TRUE.equals(item.get("create"));
            if (!(view || edit || del || create)) continue;
            ChecklistPermission p = new ChecklistPermission();
            p.setUserId(((Number) uid).longValue());
            p.setView(view);
            p.setEdit(edit);
            p.setDel(del);
            p.setCreate(create);
            toSave.add(p);
        }

        if (!toSave.isEmpty()) repo.saveAll(toSave);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/permissions/check")
    public Map<String, Boolean> checkMyPermissions() {
        Users me = usersService.getCurrentAuthenticatedUser();
        boolean canView = false, canEdit = false, canDelete = false, canCreate = false;
        if (me != null) {
            List<Long> groupIds = (me.getGroups() == null) ? Collections.emptyList() : me.getGroups().stream().map(g -> g.getId()).collect(Collectors.toList());
            List<ChecklistPermission> userPerms = repo.findByUserId(me.getUserID().longValue());
            List<ChecklistPermission> groupPerms = groupIds.isEmpty() ? Collections.emptyList() : repo.findByGroupIdIn(groupIds);
            for (ChecklistPermission p : userPerms) {
                canView |= p.isView();
                canEdit |= p.isEdit();
                canDelete |= p.isDel();
                canCreate |= p.isCreate();
            }
            for (ChecklistPermission p : groupPerms) {
                canView |= p.isView();
                canEdit |= p.isEdit();
                canDelete |= p.isDel();
                canCreate |= p.isCreate();
            }
        }
        Map<String, Boolean> m = new HashMap<>();
        m.put("view", canView);
        m.put("edit", canEdit);
        m.put("del", canDelete);
        m.put("create", canCreate);
        return m;
    }
}


