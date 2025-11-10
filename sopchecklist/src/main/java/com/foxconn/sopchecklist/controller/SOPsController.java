package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.SOPs;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.dto.SOPCreateRequest;
import com.foxconn.sopchecklist.dto.SOPDTO;
import com.foxconn.sopchecklist.service.SOPsService;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;
import com.foxconn.sopchecklist.entity.SOPDocuments;
import com.foxconn.sopchecklist.entity.SOPDocumentPermission;
import com.foxconn.sopchecklist.repository.SOPDocumentPermissionRepository;
import com.foxconn.sopchecklist.repository.SOPPermissionRepository;
import com.foxconn.sopchecklist.repository.SOPDocumentsRepository;

@RestController
@RequestMapping("/api/sops")
@CrossOrigin
public class SOPsController {

	private final SOPsService sopsService;
	private final SOPDocumentsRepository sopDocumentsRepository;
    private final UsersService usersService;
    private final SOPDocumentPermissionRepository permissionRepository;
    private final SOPPermissionRepository globalPermissionRepository;

    @org.springframework.beans.factory.annotation.Value("${sop.edit-delete.limit-days:3}")
    private int editDeleteLimitDays;

    @org.springframework.beans.factory.annotation.Autowired
    private com.foxconn.sopchecklist.service.TimeService timeService;

    public SOPsController(SOPsService sopsService, SOPDocumentsRepository sopDocumentsRepository, UsersService usersService, SOPDocumentPermissionRepository permissionRepository, SOPPermissionRepository globalPermissionRepository) {
		this.sopsService = sopsService;
		this.sopDocumentsRepository = sopDocumentsRepository;
		this.usersService = usersService;
        this.permissionRepository = permissionRepository;
        this.globalPermissionRepository = globalPermissionRepository;
	}

    @GetMapping("/debug")
    public Map<String, Object> debugPermissions() {
        Users me = usersService.getCurrentAuthenticatedUser();
        Map<String, Object> result = new HashMap<>();
        
        if (me == null) {
            result.put("error", "User not authenticated");
            return result;
        }
        
        result.put("userId", me.getUserID());
        result.put("userName", me.getFullName());
        result.put("groups", me.getGroups() != null ? me.getGroups().stream().map(g -> g.getId()).collect(java.util.stream.Collectors.toList()) : "No groups");
        
        List<SOPs> allSops = sopsService.findAll();
        result.put("totalSops", allSops.size());
        
        List<SOPDocumentPermission> userPermissions = permissionRepository.findByUserId(me.getUserID().longValue());
        result.put("userPermissions", userPermissions.stream().map(p -> {
            Map<String, Object> perm = new HashMap<>();
            perm.put("sopId", p.getSopId());
            perm.put("documentId", p.getDocumentId());
            perm.put("view", p.isView());
            perm.put("edit", p.isEdit());
            perm.put("delete", p.isDel());
            perm.put("create", p.isCreate());
            return perm;
        }).collect(java.util.stream.Collectors.toList()));
        
        List<Map<String, Object>> accessibleSops = new ArrayList<>();
        java.util.Set<Long> groupIds = new java.util.HashSet<>();
        if (me.getGroups() != null && !me.getGroups().isEmpty()) {
            me.getGroups().forEach(g -> groupIds.add(g.getId()));
        }
        
        for (SOPs sop : allSops) {
            List<SOPDocumentPermission> permissions = permissionRepository.findBySopId(sop.getId());
            boolean canView = permissions.stream().anyMatch(p -> {
                boolean groupPermission = false;
                if (!groupIds.isEmpty()) {
                    groupPermission = p.isView() && p.getGroupId() != null && groupIds.contains(p.getGroupId());
                }
                
                boolean userPermission = p.isView() && p.getUserId() != null && p.getUserId().equals(me.getUserID().longValue());
                
                return groupPermission || userPermission;
            });
            
            if (canView) {
                Map<String, Object> sopInfo = new HashMap<>();
                sopInfo.put("id", sop.getId());
                sopInfo.put("name", sop.getName());
                sopInfo.put("canView", canView);
                accessibleSops.add(sopInfo);
            }
        }
        result.put("accessibleSops", accessibleSops);
        
        return result;
    }

	@GetMapping
    public Page<SOPDTO> findAll(
			@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "false") boolean visibleOnly) {
		Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        Page<SOPs> sops = sopsService.list(pageable);
        



        if (!sops.getContent().isEmpty()) {

        } else {

        }

        if (visibleOnly) {
            Users me = usersService.getCurrentAuthenticatedUser();
            if (me == null) {

                return Page.empty(pageable);
            }
            


            if (me.getRoles() != null) {

            }
            if (me.getGroups() != null) {

            }
            

            boolean isAdmin = me.getRoles() != null && me.getRoles().stream().anyMatch(r -> {
                String n = r.getName();
                return "ADMIN".equalsIgnoreCase(n);
            });
            
            if (isAdmin) {

            } else {
                java.util.Set<Long> groupIds = new java.util.HashSet<>();
                if (me.getGroups() != null && !me.getGroups().isEmpty()) {
                    me.getGroups().forEach(g -> groupIds.add(g.getId()));
                }

                boolean globalViewUser = globalPermissionRepository.findByUserId(me.getUserID().longValue()).stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isView);
                java.util.List<com.foxconn.sopchecklist.entity.SOPPermission> globalGroupPerms = groupIds.isEmpty() ? java.util.Collections.emptyList() : globalPermissionRepository.findByGroupIdIn(new java.util.ArrayList<>(groupIds));
                boolean globalViewGroup = globalGroupPerms.stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isView);

                java.util.List<SOPs> allowed = sops.getContent().stream()
                    .filter(sop -> {
                        if (globalViewUser || globalViewGroup) {
                            return true;
                        }
                        
                        java.util.List<SOPDocumentPermission> sopPermissions = permissionRepository.findBySopId(sop.getId());
                        return sopPermissions.stream().anyMatch(p -> {
                            boolean groupPermission = false;
                            if (!groupIds.isEmpty()) {
                                groupPermission = p.isView() && p.getGroupId() != null && groupIds.contains(p.getGroupId());
                            }
                            
                            boolean userPermission = p.isView() && p.getUserId() != null && p.getUserId().equals(me.getUserID().longValue());
                            
                            return groupPermission || userPermission;
                        });
                    })
                    .collect(java.util.stream.Collectors.toList());
                

                sops = new PageImpl<>(allowed, pageable, allowed.size());
            }
        }
		

        return sops.map(sop -> {
			SOPDTO dto = new SOPDTO();
			dto.setId(sop.getId());
			dto.setName(sop.getName());
			dto.setCreatedAt(sop.getCreatedAt());
			dto.setLastEditedAt(sop.getLastEditedAt());
			
			if (sop.getCreatedBy() != null) {
				dto.setCreatedBy(sop.getCreatedBy().getFullName());
			}
			if (sop.getLastEditedBy() != null) {
				dto.setLastEditedBy(sop.getLastEditedBy().getFullName());
			}
			
            try {
                dto.setDocumentCount(sopDocumentsRepository.countBySopId(sop.getId()));
            } catch (Exception e) {
                dto.setDocumentCount(0);
            }

            Users me = usersService.getCurrentAuthenticatedUser();
            if (me != null) {
                boolean isAdmin = me.getRoles() != null && me.getRoles().stream().anyMatch(r -> {
                    String n = r.getName();
                    return "ADMIN".equalsIgnoreCase(n);
                });
                
                if (isAdmin) {
                    dto.setUserCanView(true);
                    dto.setUserCanEdit(true);
                    dto.setUserCanDelete(true);
                    dto.setUserCanCreate(true);
                } else {
                    java.util.Set<Long> groupIds = new java.util.HashSet<>();
                    if (me.getGroups() != null && !me.getGroups().isEmpty()) {
                        me.getGroups().forEach(g -> groupIds.add(g.getId()));
                    }
                    
                    boolean globalView = globalPermissionRepository.findByUserId(me.getUserID().longValue()).stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isView);
                    boolean globalEdit = globalPermissionRepository.findByUserId(me.getUserID().longValue()).stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isEdit);
                    boolean globalDelete = globalPermissionRepository.findByUserId(me.getUserID().longValue()).stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isDel);
                    boolean globalCreate = globalPermissionRepository.findByUserId(me.getUserID().longValue()).stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isCreate);

                    java.util.List<com.foxconn.sopchecklist.entity.SOPPermission> globalGroupPerms = groupIds.isEmpty() ? java.util.Collections.emptyList() : globalPermissionRepository.findByGroupIdIn(new java.util.ArrayList<>(groupIds));
                    globalView = globalView || globalGroupPerms.stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isView);
                    globalEdit = globalEdit || globalGroupPerms.stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isEdit);
                    globalDelete = globalDelete || globalGroupPerms.stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isDel);
                    globalCreate = globalCreate || globalGroupPerms.stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isCreate);
                    
                    boolean sopView = false, sopEdit = false, sopDelete = false, sopCreate = false;
                    if (!globalView || !globalEdit || !globalDelete || !globalCreate) {
                        java.util.List<SOPDocumentPermission> sopPermissions = permissionRepository.findBySopId(sop.getId());
                        sopView = sopPermissions.stream().anyMatch(p -> {
                            boolean groupPermission = false;
                            if (!groupIds.isEmpty()) {
                                groupPermission = p.isView() && p.getGroupId() != null && groupIds.contains(p.getGroupId());
                            }
                            boolean userPermission = p.isView() && p.getUserId() != null && p.getUserId().equals(me.getUserID().longValue());
                            return groupPermission || userPermission;
                        });
                        
                        sopEdit = sopPermissions.stream().anyMatch(p -> {
                            boolean groupPermission = false;
                            if (!groupIds.isEmpty()) {
                                groupPermission = p.isEdit() && p.getGroupId() != null && groupIds.contains(p.getGroupId());
                            }
                            boolean userPermission = p.isEdit() && p.getUserId() != null && p.getUserId().equals(me.getUserID().longValue());
                            return groupPermission || userPermission;
                        });
                        
                        sopDelete = sopPermissions.stream().anyMatch(p -> {
                            boolean groupPermission = false;
                            if (!groupIds.isEmpty()) {
                                groupPermission = p.isDel() && p.getGroupId() != null && groupIds.contains(p.getGroupId());
                            }
                            boolean userPermission = p.isDel() && p.getUserId() != null && p.getUserId().equals(me.getUserID().longValue());
                            return groupPermission || userPermission;
                        });
                        
                        sopCreate = sopPermissions.stream().anyMatch(p -> {
                            boolean groupPermission = false;
                            if (!groupIds.isEmpty()) {
                                groupPermission = p.isCreate() && p.getGroupId() != null && groupIds.contains(p.getGroupId());
                            }
                            boolean userPermission = p.isCreate() && p.getUserId() != null && p.getUserId().equals(me.getUserID().longValue());
                            return groupPermission || userPermission;
                        });
                    }
                    
                    dto.setUserCanView(globalView || sopView);
                    dto.setUserCanEdit(globalEdit || sopEdit);
                    dto.setUserCanDelete(globalDelete || sopDelete);
                    dto.setUserCanCreate(globalCreate || sopCreate);
                }
            }

			return dto;
		});
	}

	@GetMapping("/{id}")
	public ResponseEntity<SOPDTO> findOne(@PathVariable Long id) {
		SOPs sop = sopsService.findById(id);
		if (sop == null) {
			return ResponseEntity.notFound().build();
		}
		

		Users me = usersService.getCurrentAuthenticatedUser();
		if (me != null) {

			boolean isAdmin = me.getRoles() != null && me.getRoles().stream().anyMatch(r -> {
				String n = r.getName();
				return "ADMIN".equalsIgnoreCase(n);
			});
			
			if (!isAdmin) {
				java.util.Set<Long> groupIds = new java.util.HashSet<>();
				if (me.getGroups() != null && !me.getGroups().isEmpty()) {
					me.getGroups().forEach(g -> groupIds.add(g.getId()));
				}

				java.util.List<SOPDocumentPermission> permissions = permissionRepository.findBySopId(id);
				boolean hasPermission = permissions.stream()
					.anyMatch(p -> {
						boolean groupPermission = false;
						if (!groupIds.isEmpty()) {
							groupPermission = p.isView() && p.getGroupId() != null && groupIds.contains(p.getGroupId());
						}
						
						boolean userPermission = p.isView() && p.getUserId() != null && p.getUserId().equals(me.getUserID().longValue());
						
						return groupPermission || userPermission;
					});

				if (!hasPermission) {
					boolean globalViewUser = globalPermissionRepository.findByUserId(me.getUserID().longValue()).stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isView);
					java.util.List<com.foxconn.sopchecklist.entity.SOPPermission> globalGroupPerms = groupIds.isEmpty() ? java.util.Collections.emptyList() : globalPermissionRepository.findByGroupIdIn(new java.util.ArrayList<>(groupIds));
					boolean globalViewGroup = globalGroupPerms.stream().anyMatch(com.foxconn.sopchecklist.entity.SOPPermission::isView);
					hasPermission = globalViewUser || globalViewGroup;
				}
				
				if (!hasPermission) {
					return ResponseEntity.status(403).build();
				}
			}
		}
		

		SOPDTO dto = new SOPDTO();
		dto.setId(sop.getId());
		dto.setName(sop.getName());
		dto.setCreatedAt(sop.getCreatedAt());
		dto.setLastEditedAt(sop.getLastEditedAt());
		
		if (sop.getCreatedBy() != null) {
			dto.setCreatedBy(sop.getCreatedBy().getFullName());
		}
		if (sop.getLastEditedBy() != null) {
			dto.setLastEditedBy(sop.getLastEditedBy().getFullName());
		}
		
		return ResponseEntity.ok(dto);
	}

    @GetMapping("/{id}/documents")
    public ResponseEntity<List<Map<String, Object>>> documents(@PathVariable Long id, @RequestParam(required = false, defaultValue = "false") boolean visibleOnly) {
		try {

            List<SOPDocuments> documents = sopDocumentsRepository.findBySopIdCustom(id);


            if (visibleOnly) {
                Users me = usersService.getCurrentAuthenticatedUser();
                if (me == null) {
                    return ResponseEntity.ok(new ArrayList<>());
                }
                

                boolean isAdmin = me.getRoles() != null && me.getRoles().stream().anyMatch(r -> {
                    String n = r.getName();
                    return "ADMIN".equalsIgnoreCase(n);
                });
                
                if (!isAdmin) {
                    java.util.Set<Long> groupIds = new java.util.HashSet<>();
                    if (me.getGroups() != null && !me.getGroups().isEmpty()) {
                        me.getGroups().forEach(g -> groupIds.add(g.getId()));
                    }
                    

                    documents = documents.stream().filter(doc -> {
                        boolean hasDocPermission = permissionRepository.findByDocumentId(doc.getDocumentID()).stream()
                            .anyMatch(p -> {
                                boolean groupPermission = false;
                                if (!groupIds.isEmpty()) {
                                    groupPermission = p.isView() && p.getGroupId() != null && groupIds.contains(p.getGroupId());
                                }
                                
                                boolean userPermission = p.isView() && p.getUserId() != null && p.getUserId().equals(me.getUserID().longValue());
                                
                                return groupPermission || userPermission;
                            });
                        
                        if (!hasDocPermission) {
                            hasDocPermission = permissionRepository.findBySopId(id).stream()
                                .anyMatch(p -> {
                                    boolean groupPermission = false;
                                    if (!groupIds.isEmpty()) {
                                        groupPermission = p.isView() && p.getGroupId() != null && groupIds.contains(p.getGroupId());
                                    }
                                    
                                    boolean userPermission = p.isView() && p.getUserId() != null && p.getUserId().equals(me.getUserID().longValue());
                                    
                                    return groupPermission || userPermission;
                                });
                        }
                        
                        return hasDocPermission;
                    }).toList();
                }
            }
			

			List<Map<String, Object>> result = new ArrayList<>();
			for (SOPDocuments doc : documents) {
				Map<String, Object> docMap = new HashMap<>();
				docMap.put("documentID", doc.getDocumentID());
				docMap.put("title", doc.getTitle());
				docMap.put("description", doc.getDescription());
				docMap.put("createdAt", doc.getCreatedAt());
				docMap.put("lastEditedAt", doc.getLastEditedAt());
				if (doc.getCreatedBy() != null) {
					docMap.put("createdBy", doc.getCreatedBy().getFullName());
				}
				if (doc.getLastEditedBy() != null) {
					docMap.put("lastEditedBy", doc.getLastEditedBy().getFullName());
				}
				

				if (doc.getFiles() != null && !doc.getFiles().isEmpty()) {
					List<Map<String, Object>> filesList = new ArrayList<>();
					for (var file : doc.getFiles()) {
						Map<String, Object> fileMap = new HashMap<>();
						fileMap.put("id", file.getId());
						fileMap.put("fileName", file.getFileName());
						fileMap.put("filePath", file.getFilePath());
						fileMap.put("fileSize", file.getFileSize());
						fileMap.put("fileType", file.getFileType());
						fileMap.put("createdAt", file.getCreatedAt());
						filesList.add(fileMap);
					}
					docMap.put("files", filesList);
				} else {
					docMap.put("files", new ArrayList<>());
				}
				
				result.add(docMap);
			}
			
			return ResponseEntity.ok(result);
		} catch (Exception e) {
			return ResponseEntity.ok(new ArrayList<>());
		}
	}

	@PostMapping
	public ResponseEntity<?> create(@RequestBody SOPCreateRequest request) {
		try {

			if (sopsService.existsByName(request.getName())) {
				return ResponseEntity.badRequest()
					.body(Map.of("error", "DUPLICATE_NAME", "duplicateName", request.getName()));
			}
			
			SOPs sop = new SOPs();
            sop.setName(request.getName());
			
			if (request.getCreatedBy() != null) {
				Users user = usersService.findById(request.getCreatedBy());
				if (user != null) {
					sop.setCreatedBy(user);
				}
			}
			

            sop.setCreatedAt(timeService.nowVietnam());
            SOPs created = sopsService.save(sop);
			

			SOPDTO dto = new SOPDTO();
			dto.setId(created.getId());
			dto.setName(created.getName());
			dto.setCreatedAt(created.getCreatedAt());
			dto.setLastEditedAt(created.getLastEditedAt());
			
			if (created.getCreatedBy() != null) {
				dto.setCreatedBy(created.getCreatedBy().getFullName());
			}
			if (created.getLastEditedBy() != null) {
				dto.setLastEditedBy(created.getLastEditedBy().getFullName());
			}
			
			return ResponseEntity.created(URI.create("/api/sops/" + created.getId())).body(dto);
		} catch (Exception e) {
			return ResponseEntity.badRequest()
				.body(Map.of("error", "Có lỗi xảy ra khi tạo SOP: " + e.getMessage()));
		}
	}

	@PutMapping("/{id}")
	public ResponseEntity<SOPs> replace(@PathVariable Long id, @RequestBody SOPs incoming) {
		SOPs existed = sopsService.findById(id);
		if (existed == null) return ResponseEntity.notFound().build();
		incoming.setId(id);
		SOPs saved = sopsService.update(incoming);
		return ResponseEntity.ok(saved);
	}

	@PatchMapping("/{id}")
	public ResponseEntity<?> patch(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
		SOPs existed = sopsService.findById(id);
		if (existed == null) return ResponseEntity.notFound().build();
		
		if (updates.containsKey("name")) {
			String newName = (String) updates.get("name");
			

			if (sopsService.existsByNameAndIdNot(newName, id)) {
				return ResponseEntity.badRequest()
					.body(Map.of("error", "DUPLICATE_NAME", "duplicateName", newName));
			}
			
			existed.setName(newName);
		}
		
		if (updates.containsKey("lastEditedBy")) {
			Integer userId = (Integer) updates.get("lastEditedBy");
			if (userId != null) {
				Users user = usersService.findById(userId);
				if (user != null) {
					existed.setLastEditedBy(user);
				}
			}
		}
		

        existed.setLastEditedAt(timeService.nowVietnam());
		
		SOPs saved = sopsService.update(existed);
		return ResponseEntity.ok(saved);
	}

	@GetMapping("/search")
	public Page<SOPs> search(
			@RequestParam(required = false, name = "q") String q,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size) {
		Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
		return sopsService.search(q, pageable);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
		try {
			SOPs existed = sopsService.findById(id);
			if (existed == null) return ResponseEntity.notFound().build();


            Users me = usersService.getCurrentAuthenticatedUser();
            boolean isAdmin = me != null && me.getRoles() != null && me.getRoles().stream().anyMatch(r -> {
                String n = r.getName();
                return "ADMIN".equalsIgnoreCase(n);
            });
            if (!isAdmin) {
                java.time.LocalDateTime pivot = existed.getLastEditedAt();
                if (pivot == null) pivot = existed.getCreatedAt();
                if (pivot != null && pivot.isBefore(timeService.nowVietnam().minusDays(editDeleteLimitDays))) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "Bạn không thể xóa. Vui lòng liên hệ admin");
                    return ResponseEntity.status(403).body(error);
                }
            }
			

			int documentCount = existed.getDocuments() != null ? existed.getDocuments().size() : 0;
			int totalFileCount = 0;
			if (existed.getDocuments() != null) {
				for (SOPDocuments doc : existed.getDocuments()) {
					if (doc.getFiles() != null) {
						totalFileCount += doc.getFiles().size();
					}
				}
			}
			
			sopsService.delete(id);
			

			Map<String, Object> result = new HashMap<>();
			result.put("message", "SOP deleted successfully");
			result.put("deletedDocuments", documentCount);
			result.put("deletedFiles", totalFileCount);
			
			return ResponseEntity.ok(result);
		} catch (Exception e) {
			Map<String, Object> error = new HashMap<>();
			error.put("error", "Failed to delete SOP: " + e.getMessage());
			return ResponseEntity.badRequest().body(error);
		}
	}

}

