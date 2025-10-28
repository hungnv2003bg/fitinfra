package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.TypeCronMail;
import com.foxconn.sopchecklist.service.TypeCronMailService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/type-cron-mail")
@CrossOrigin
public class TypeCronMailController {

    private final TypeCronMailService service;

    public TypeCronMailController(TypeCronMailService service) {
        this.service = service;
    }

    @GetMapping
    public List<TypeCronMail> listAll() {
        return service.listAll();
    }

    @GetMapping("/enabled")
    public List<TypeCronMail> listEnabled() {
        return service.listEnabled();
    }

    @GetMapping("/by-type/{typeName}")
    public TypeCronMail findByTypeName(@PathVariable String typeName) {
        return service.findByTypeName(typeName);
    }

    @PostMapping
    public TypeCronMail add(@RequestBody TypeCronMail typeCronMail) {
        return service.add(typeCronMail);
    }

    @PutMapping("/{id}")
    public TypeCronMail update(@PathVariable Long id, @RequestBody TypeCronMail typeCronMail) {
        return service.update(id, typeCronMail);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}

