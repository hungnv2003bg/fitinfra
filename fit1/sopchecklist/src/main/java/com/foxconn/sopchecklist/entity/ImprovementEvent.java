package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.util.List;

@Entity
@Table(name = "improvement_events")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ImprovementEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_name", columnDefinition = "NVARCHAR(255)", nullable = false)
    private String eventName;

    // One-to-many relationship với Improvements
    @OneToMany(mappedBy = "improvementEvent", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Improvements> improvements;
}
