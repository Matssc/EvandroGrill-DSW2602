package br.com.evandrosgrill.repository;

import br.com.evandrosgrill.model.entity.Venda;
import br.com.evandrosgrill.model.enums.FormaPagamentoVenda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface VendaRepository extends JpaRepository<Venda, Long> {

    Optional<Venda> findByIdAndUsuarioId(Long id, Long usuarioId);

    // Vendas de um dia, a última lançada primeiro
    List<Venda> findByUsuarioIdAndDataOrderByIdDesc(Long usuarioId, LocalDate data);

    // Vendas de um período (ex.: o mês)
    List<Venda> findByUsuarioIdAndDataBetweenOrderByDataAsc(Long usuarioId, LocalDate inicio, LocalDate fim);

    // Vendas do dia que ainda não foram ligadas a um fechamento
    List<Venda> findByUsuarioIdAndDataAndFechamentoDiarioIsNull(Long usuarioId, LocalDate data);

    // Quantidade de vendas do dia (ticket médio = total / quantidade, calculado no service)
    long countByUsuarioIdAndData(Long usuarioId, LocalDate data);

    // Total vendido no dia (usado para calcular o fechamento)
    @Query("select coalesce(sum(v.valor), 0) from Venda v "
            + "where v.usuario.id = :usuarioId and v.data = :data")
    BigDecimal somarPorData(@Param("usuarioId") Long usuarioId, @Param("data") LocalDate data);

    // "Hoje por pagamento": quantidade e total por forma de pagamento
    @Query("select v.formaPagamento as formaPagamento, count(v) as quantidade, sum(v.valor) as total "
            + "from Venda v "
            + "where v.usuario.id = :usuarioId and v.data = :data "
            + "group by v.formaPagamento")
    List<TotalPorPagamento> totalPorFormaPagamento(@Param("usuarioId") Long usuarioId,
                                                   @Param("data") LocalDate data);

    // Resultado resumido da consulta totalPorFormaPagamento
    interface TotalPorPagamento {
        FormaPagamentoVenda getFormaPagamento();

        Long getQuantidade();

        BigDecimal getTotal();
    }
}
