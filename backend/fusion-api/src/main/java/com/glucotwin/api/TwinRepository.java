package com.glucotwin.api;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TwinRepository extends JpaRepository<TwinEntry,Long> {
    List<TwinEntry> findTop20ByPatientIdAndKindOrderByIdDesc(String patientId,String kind);
    List<TwinEntry> findByPatientIdAndKindOrderByIdAsc(String patientId,String kind);
}
