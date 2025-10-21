package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.SOPPermission;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.SOPPermissionRepository;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sops/global")
@CrossOrigin
public class SOPPermissionsController {

    private final SOPPermissionRepository repo;
    private final UsersService usersService;

    public SOPPermissionsController(SOPPermissionRepository repo, UsersService usersService) {
        this.repo = repo;
        this.usersService = usersService;
    }

    @GetMapping("/permissions")
    public Map<String, Object> getGlobalPermissions() {
        List<SOPPermission> list = repo.findAll();
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
    public ResponseEntity<?> saveGlobalPermissions(@RequestBody Map<String, Object> payload) {
        List<SOPPermission> existing = repo.findAll();
        repo.deleteAll(existing);
        List<SOPPermission> toSave = new ArrayList<>();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> groups = (List<Map<String, Object>>) payload.getOrDefault("groups", new ArrayList<>());
        for (Map<String, Object> item : groups) {
            Long groupId = safeLong(item.get("groupId"));
            boolean view = safeBool(item.get("view"));
            boolean edit = safeBool(item.get("edit"));
            boolean del = safeBool(item.get("del"));
            boolean create = safeBool(item.get("create"));
            if (groupId == null || !(view || edit || del || create)) continue;
            SOPPermission p = new SOPPermission();
            p.setGroupId(groupId);
            p.setView(view);
            p.setEdit(edit);
            p.setDel(del);
            p.setCreate(create);
            toSave.add(p);
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> users = (List<Map<String, Object>>) payload.getOrDefault("users", new ArrayList<>());
        for (Map<String, Object> item : users) {
            Long userId = safeLong(item.get("userId"));
            boolean view = safeBool(item.get("view"));
            boolean edit = safeBool(item.get("edit"));
            boolean del = safeBool(item.get("del"));
            boolean create = safeBool(item.get("create"));
            if (userId == null || !(view || edit || del || create)) continue;
            SOPPermission p = new SOPPermission();
            p.setUserId(userId);
            p.setView(view);
            p.setEdit(edit);
            p.setDel(del);
            p.setCreate(create);
            toSave.add(p);
        }

        if (!toSave.isEmpty()) repo.saveAll(toSave);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/permissions/my")
    public Map<String, Boolean> myGlobalPermissions() {
        Users me = usersService.getCurrentAuthenticatedUser();
        Map<String, Boolean> result = new HashMap<>();
        if (me == null) {
            result.put("view", false);
            result.put("edit", false);
            result.put("delete", false);
            result.put("create", false);
            return result;
        }

        boolean isAdmin = me.getRoles() != null && me.getRoles().stream().anyMatch(r -> {
            String n = r.getName();
            return "ADMIN".equalsIgnoreCase(n);
        });
        if (isAdmin) {
            result.put("view", true);
            result.put("edit", true);
            result.put("delete", true);
            result.put("create", true);
            return result;
        }

        boolean userView = repo.findByUserId(me.getUserID().longValue()).stream().anyMatch(SOPPermission::isView);
        boolean userEdit = repo.findByUserId(me.getUserID().longValue()).stream().anyMatch(SOPPermission::isEdit);
        boolean userDelete = repo.findByUserId(me.getUserID().longValue()).stream().anyMatch(SOPPermission::isDel);
        boolean userCreate = repo.findByUserId(me.getUserID().longValue()).stream().anyMatch(SOPPermission::isCreate);

        List<Long> groupIds = (me.getGroups() == null) ? Collections.emptyList() : me.getGroups().stream().map(g -> g.getId()).collect(Collectors.toList());
        List<SOPPermission> groupPerms = groupIds.isEmpty() ? Collections.emptyList() : repo.findByGroupIdIn(groupIds);
        boolean groupView = groupPerms.stream().anyMatch(SOPPermission::isView);
        boolean groupEdit = groupPerms.stream().anyMatch(SOPPermission::isEdit);
        boolean groupDelete = groupPerms.stream().anyMatch(SOPPermission::isDel);
        boolean groupCreate = groupPerms.stream().anyMatch(SOPPermission::isCreate);

        result.put("view", userView || groupView);
        result.put("edit", userEdit || groupEdit);
        result.put("delete", userDelete || groupDelete);
        result.put("create", userCreate || groupCreate);
        return result;
    }

    private Long safeLong(Object v) {
        try {
            if (v == null) return null;
            if (v instanceof Number) return ((Number) v).longValue();
            String s = String.valueOf(v).trim();
            if (s.isEmpty()) return null;
            return Long.parseLong(s);
        } catch (Exception e) { return null; }
    }

    private boolean safeBool(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean) return (Boolean) v;
        String s = String.valueOf(v).trim();
        return "true".equalsIgnoreCase(s) || "1".equals(s);
    }
}


