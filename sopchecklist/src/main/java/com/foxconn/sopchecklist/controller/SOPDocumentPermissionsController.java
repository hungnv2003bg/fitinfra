package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.SOPDocumentPermission;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.SOPDocumentPermissionRepository;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sops")
@CrossOrigin
public class SOPDocumentPermissionsController {

    private final SOPDocumentPermissionRepository repo;
    private final UsersService usersService;

    public SOPDocumentPermissionsController(SOPDocumentPermissionRepository repo, UsersService usersService) {
        this.repo = repo;
        this.usersService = usersService;
    }

    @GetMapping("/{id}/permissions")
    public Map<String, Object> getSopPermissions(@PathVariable Long id) {
        List<SOPDocumentPermission> list = repo.findBySopId(id);
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

    @PostMapping("/{id}/permissions")
    public ResponseEntity<?> saveSopPermissions(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            List<SOPDocumentPermission> existing = repo.findBySopId(id);
            repo.deleteAll(existing);
            List<SOPDocumentPermission> toSave = new ArrayList<>();
            
            @SuppressWarnings("unchecked") 
            List<Map<String, Object>> groups = (List<Map<String, Object>>) payload.getOrDefault("groups", new ArrayList<>());
            for (Map<String, Object> item : groups) {
                Long groupId = safeLong(item.get("groupId"));
                boolean view = safeBool(item.get("view"));
                boolean edit = safeBool(item.get("edit"));
                boolean del = safeBool(item.get("del"));
                boolean create = safeBool(item.get("create"));
                if (groupId == null || !(view || edit || del || create)) continue;
                SOPDocumentPermission p = new SOPDocumentPermission();
                p.setSopId(id);
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
                SOPDocumentPermission p = new SOPDocumentPermission();
                p.setSopId(id);
                p.setUserId(userId);
                p.setView(view);
                p.setEdit(edit);
                p.setDel(del);
                p.setCreate(create);
                toSave.add(p);
            }
            
            if (!toSave.isEmpty()) repo.saveAll(toSave);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to save permissions: " + e.getMessage()));
        }
    }

    @GetMapping("/documents/{documentId}/permissions")
    public List<Map<String, Object>> getDocPermissions(@PathVariable Integer documentId, @RequestParam(required = false) Boolean mine) {
        List<SOPDocumentPermission> list = repo.findByDocumentId(documentId);
        if (Boolean.TRUE.equals(mine)) {
            Users me = usersService.getCurrentAuthenticatedUser();
            if (me == null) return Collections.emptyList();
            Set<Long> myGroupIds = me.getGroups() == null ? Collections.emptySet() : me.getGroups().stream().map(g -> g.getId()).collect(Collectors.toSet());
            list = list.stream().filter(p -> myGroupIds.contains(p.getGroupId())).collect(Collectors.toList());
        }
        return list.stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("groupId", p.getGroupId());
            m.put("view", p.isView());
            m.put("edit", p.isEdit());
            m.put("del", p.isDel());
            m.put("create", p.isCreate());
            return m;
        }).collect(Collectors.toList());
    }

    @PostMapping("/documents/{documentId}/permissions")
    public ResponseEntity<?> saveDocPermissions(@PathVariable Integer documentId, @RequestBody List<Map<String, Object>> payload) {
        List<SOPDocumentPermission> existing = repo.findByDocumentId(documentId);
        repo.deleteAll(existing);
        List<SOPDocumentPermission> toSave = new ArrayList<>();
        for (Map<String, Object> item : payload) {
            Long groupId = safeLong(item.get("groupId"));
            boolean view = safeBool(item.get("view"));
            boolean edit = safeBool(item.get("edit"));
            boolean del = safeBool(item.get("del"));
            boolean create = safeBool(item.get("create"));
            if (groupId == null || !(view || edit || del || create)) continue;
            SOPDocumentPermission p = new SOPDocumentPermission();
            p.setDocumentId(documentId);
            p.setGroupId(groupId);
            p.setView(view);
            p.setEdit(edit);
            p.setDel(del);
            p.setCreate(create);
            toSave.add(p);
        }
        if (!toSave.isEmpty()) repo.saveAll(toSave);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/permissions/check")
    public boolean canViewSop(@PathVariable Long id) {
        Users me = usersService.getCurrentAuthenticatedUser();
        if (me == null) return false;
        List<SOPDocumentPermission> userPerms = repo.findBySopIdAndUserId(id, me.getUserID().longValue());
        boolean userView = userPerms.stream().anyMatch(SOPDocumentPermission::isView);
        List<Long> groupIds = (me.getGroups() == null) ? Collections.emptyList() : me.getGroups().stream().map(g -> g.getId()).collect(Collectors.toList());
        boolean groupView = groupIds.isEmpty() ? false : repo.findBySopIdAndGroupIdIn(id, groupIds).stream().anyMatch(SOPDocumentPermission::isView);
        return userView || groupView;
    }

    @GetMapping("/documents/{documentId}/permissions/check")
    public boolean canViewDoc(@PathVariable Integer documentId) {
        Users me = usersService.getCurrentAuthenticatedUser();
        if (me == null) return false;
        List<SOPDocumentPermission> userPerms = repo.findByDocumentIdAndUserId(documentId, me.getUserID().longValue());
        boolean userView = userPerms.stream().anyMatch(SOPDocumentPermission::isView);
        List<Long> groupIds = (me.getGroups() == null) ? Collections.emptyList() : me.getGroups().stream().map(g -> g.getId()).collect(Collectors.toList());
        boolean groupView = groupIds.isEmpty() ? false : repo.findByDocumentIdAndGroupIdIn(documentId, groupIds).stream().anyMatch(SOPDocumentPermission::isView);
        return userView || groupView;
    }

    @GetMapping("/{id}/permissions/my")
    public Map<String, Boolean> getMyPermissions(@PathVariable Long id) {
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

        List<SOPDocumentPermission> userPerms = repo.findBySopIdAndUserId(id, me.getUserID().longValue());
        boolean userView = userPerms.stream().anyMatch(SOPDocumentPermission::isView);
        boolean userEdit = userPerms.stream().anyMatch(SOPDocumentPermission::isEdit);
        boolean userDelete = userPerms.stream().anyMatch(SOPDocumentPermission::isDel);
        boolean userCreate = userPerms.stream().anyMatch(SOPDocumentPermission::isCreate);

        List<Long> groupIds = (me.getGroups() == null) ? Collections.emptyList() : me.getGroups().stream().map(g -> g.getId()).collect(Collectors.toList());
        List<SOPDocumentPermission> groupPerms = groupIds.isEmpty() ? Collections.emptyList() : repo.findBySopIdAndGroupIdIn(id, groupIds);
        boolean groupView = groupPerms.stream().anyMatch(SOPDocumentPermission::isView);
        boolean groupEdit = groupPerms.stream().anyMatch(SOPDocumentPermission::isEdit);
        boolean groupDelete = groupPerms.stream().anyMatch(SOPDocumentPermission::isDel);
        boolean groupCreate = groupPerms.stream().anyMatch(SOPDocumentPermission::isCreate);

        result.put("view", userView || groupView);
        result.put("edit", userEdit || groupEdit);
        result.put("delete", userDelete || groupDelete);
        result.put("create", userCreate || groupCreate);
        return result;
    }

    @GetMapping("/documents/{documentId}/permissions/my")
    public Map<String, Boolean> getMyDocPermissions(@PathVariable Integer documentId) {
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

        List<SOPDocumentPermission> userPerms = repo.findByDocumentIdAndUserId(documentId, me.getUserID().longValue());
        boolean userView = userPerms.stream().anyMatch(SOPDocumentPermission::isView);
        boolean userEdit = userPerms.stream().anyMatch(SOPDocumentPermission::isEdit);
        boolean userDelete = userPerms.stream().anyMatch(SOPDocumentPermission::isDel);
        boolean userCreate = userPerms.stream().anyMatch(SOPDocumentPermission::isCreate);

        List<Long> groupIds = (me.getGroups() == null) ? Collections.emptyList() : me.getGroups().stream().map(g -> g.getId()).collect(Collectors.toList());
        List<SOPDocumentPermission> groupPerms = groupIds.isEmpty() ? Collections.emptyList() : repo.findByDocumentIdAndGroupIdIn(documentId, groupIds);
        boolean groupView = groupPerms.stream().anyMatch(SOPDocumentPermission::isView);
        boolean groupEdit = groupPerms.stream().anyMatch(SOPDocumentPermission::isEdit);
        boolean groupDelete = groupPerms.stream().anyMatch(SOPDocumentPermission::isDel);
        boolean groupCreate = groupPerms.stream().anyMatch(SOPDocumentPermission::isCreate);

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



