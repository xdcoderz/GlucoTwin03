package com.glucotwin.api;

import jakarta.persistence.*;

@Entity
@Table(name="twin_entries", indexes=@Index(name="ix_twin_patient_kind",columnList="patientId,kind"))
public class TwinEntry {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
    @Column(nullable=false) String patientId;
    @Column(nullable=false) String kind;
    @Lob @Column(nullable=false,updatable=false) String recordJson;
}
