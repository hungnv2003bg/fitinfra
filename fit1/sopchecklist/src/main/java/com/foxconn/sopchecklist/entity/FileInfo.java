package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.Embeddable;

@Embeddable
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class FileInfo {
    @javax.persistence.Column(columnDefinition = "NVARCHAR(400)")
    private String name;
    @javax.persistence.Column(columnDefinition = "NVARCHAR(1000)")
    private String url;
    private String uid;
}



