package br.com.evandrosgrill.repository;

import br.com.evandrosgrill.model.entity.MovimentoReserva;
import br.com.evandrosgrill.model.enums.TipoMovimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MovimentoReservaRepository extends JpaRepository<MovimentoReserva, Long> {

    Optional<MovimentoReserva> findByIdAndUsuarioId(Long id, Long usuarioId);

    // Histórico de entradas e saídas, do mais recente para o mais antigo
    List<MovimentoReserva> findByUsuarioIdOrderByDataDescIdDesc(Long usuarioId);

    // Movimento gerado por um fechamento diário
    Optional<MovimentoReserva> findByFechamentoDiarioId(Long fechamentoDiarioId);

    // Saldo acumulado: soma das entradas menos as saídas
    @Query("select coalesce(sum(case when m.tipo = br.com.evandrosgrill.model.enums.TipoMovimento.ENTRADA "
            + "then m.valor else -m.valor end), 0) "
            + "from MovimentoReserva m where m.usuario.id = :usuarioId")
    BigDecimal calcularSaldo(@Param("usuarioId") Long usuarioId);

    // "Saldo em 30/09": saldo acumulado até uma data
    @Query("select coalesce(sum(case when m.tipo = br.com.evandrosgrill.model.enums.TipoMovimento.ENTRADA "
            + "then m.valor else -m.valor end), 0) "
            + "from MovimentoReserva m "
            + "where m.usuario.id = :usuarioId and m.data <= :data")
    BigDecimal calcularSaldoAte(@Param("usuarioId") Long usuarioId, @Param("data") LocalDate data);

    // Cards "Entrou em outubro" e "Saiu em outubro"
    @Query("select coalesce(sum(m.valor), 0) from MovimentoReserva m "
            + "where m.usuario.id = :usuarioId and m.tipo = :tipo "
            + "and m.data between :inicio and :fim")
    BigDecimal somarPorTipoNoPeriodo(@Param("usuarioId") Long usuarioId,
                                     @Param("tipo") TipoMovimento tipo,
                                     @Param("inicio") LocalDate inicio,
                                     @Param("fim") LocalDate fim);
}
