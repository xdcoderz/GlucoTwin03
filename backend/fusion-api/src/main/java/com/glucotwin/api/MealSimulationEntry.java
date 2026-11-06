package com.glucotwin.api;

import jakarta.persistence.*;

@Entity
@Table(name="meal_simulations",indexes=@Index(name="ix_meal_simulation_patient",columnList="patientId"))
public class MealSimulationEntry {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
    @Column(nullable=false) String patientId;
    @Lob @Column(nullable=false,updatable=false) String recordJson;
}
