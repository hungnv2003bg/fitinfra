package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.TypeMailRecipient;
import com.foxconn.sopchecklist.service.TypeMailRecipientService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/type-mail-recipients")
@CrossOrigin
public class TypeMailRecipientController {

    private final TypeMailRecipientService service;

    public TypeMailRecipientController(TypeMailRecipientService service) {
        this.service = service;
    }

    @GetMapping
    public List<TypeMailRecipient> listAll() {
        return service.listAll();
    }

    @GetMapping("/enabled")
    public List<TypeMailRecipient> listEnabled() {
        return service.listEnabled();
    }

    @GetMapping("/by-type/{typeName}")
    public TypeMailRecipient findByTypeName(@PathVariable String typeName) {
        return service.findByTypeName(typeName);
    }

    @PostMapping
    public TypeMailRecipient add(@RequestBody TypeMailRecipient typeMailRecipient) {
        return service.add(typeMailRecipient);
    }

    @PutMapping("/{id}")
    public TypeMailRecipient update(@PathVariable Long id, @RequestBody TypeMailRecipient typeMailRecipient) {
        return service.update(id, typeMailRecipient);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
