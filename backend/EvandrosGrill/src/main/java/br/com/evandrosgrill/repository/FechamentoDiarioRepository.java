package br.com.evandrosgrill.repository;

import br.com.evandrosgrill.model.entity.FechamentoDiario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FechamentoDiarioRepository extends JpaRepository<FechamentoDiario, Long> {

    Optional<FechamentoDiario> findByIdAndUsuarioId(Long id, Long usuarioId);

    Optional<FechamentoDiario> findByUsuarioIdAndData(Long usuarioId, LocalDate data);

    // Impedir fechar o mesmo dia duas vezes
    boolean existsByUsuarioIdAndData(Long usuarioId, LocalDate data);

    // Fechamentos do mês (base do fechamento mensal, RN08)
    List<FechamentoDiario> findByUsuarioIdAndDataBetweenOrderByDataAsc(Long usuarioId, LocalDate inicio, LocalDate fim);

    // Dias trabalhados no período (RN05): um fechamento = um dia trabalhado
    long countByUsuarioIdAndDataBetween(Long usuarioId, LocalDate inicio, LocalDate fim);

    // Resumo do período: vendido, retirada, salário, reserva e dias trabalhados
    // (Dashboard, Pró-labore e Fechamento do mês)
    @Query("select coalesce(sum(f.totalVendido), 0) as totalVendido, "
            + "coalesce(sum(f.valorRetirada), 0) as totalRetirada, "
            + "coalesce(sum(f.valorSalario), 0) as totalSalario, "
            + "coalesce(sum(f.valorReserva), 0) as totalReserva, "
            + "count(f) as diasTrabalhados "
            + "from FechamentoDiario f "
            + "where f.usuario.id = :usuarioId and f.data between :inicio and :fim")
    ResumoPeriodo resumirPeriodo(@Param("usuarioId") Long usuarioId,
                                 @Param("inicio") LocalDate inicio,
                                 @Param("fim") LocalDate fim);

    // Resultado resumido da consulta resumirPeriodo
    interface ResumoPeriodo {
        BigDecimal getTotalVendido();

        BigDecimal getTotalRetirada();

        BigDecimal getTotalSalario();

        BigDecimal getTotalReserva();

        Long getDiasTrabalhados();
    }
}
