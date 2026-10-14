package br.com.evandrosgrill.repository;

import br.com.evandrosgrill.model.entity.Compra;
import br.com.evandrosgrill.model.enums.FormaPagamentoCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CompraRepository extends JpaRepository<Compra, Long> {

    Optional<Compra> findByIdAndUsuarioId(Long id, Long usuarioId);

    // Todas as compras do período, em ordem cronológica (relatórios)
    List<Compra> findByUsuarioIdAndDataBetweenOrderByDataAsc(Long usuarioId, LocalDate inicio, LocalDate fim);

    // Tela Compras: mais recentes primeiro
    List<Compra> findByUsuarioIdAndDataBetweenOrderByDataDescIdDesc(
            Long usuarioId, LocalDate inicio, LocalDate fim);

    // Campo "Buscar compra"
    List<Compra> findByUsuarioIdAndDescricaoContainingIgnoreCaseOrderByDataDescIdDesc(
            Long usuarioId, String texto);

    // Compras de um cartão no período (RN07)
    List<Compra> findByUsuarioIdAndCartaoPjIdAndDataBetweenOrderByDataAsc(
            Long usuarioId, Long cartaoPjId, LocalDate inicio, LocalDate fim);

    // Compras à vista ou no cartão no período (relatório da contadora, RN09)
    List<Compra> findByUsuarioIdAndFormaPagamentoAndDataBetweenOrderByDataAsc(
            Long usuarioId, FormaPagamentoCompra formaPagamento, LocalDate inicio, LocalDate fim);

    // Quantidade de compras do período
    long countByUsuarioIdAndDataBetween(Long usuarioId, LocalDate inicio, LocalDate fim);

    // Quantidade de compras à vista ou no cartão no período
    long countByUsuarioIdAndFormaPagamentoAndDataBetween(
            Long usuarioId, FormaPagamentoCompra formaPagamento, LocalDate inicio, LocalDate fim);

    // Total gasto no período (cards de topo)
    @Query("select coalesce(sum(c.valor), 0) from Compra c "
            + "where c.usuario.id = :usuarioId and c.data between :inicio and :fim")
    BigDecimal totalGeral(@Param("usuarioId") Long usuarioId,
                          @Param("inicio") LocalDate inicio,
                          @Param("fim") LocalDate fim);

    // Total gasto por cartão no período, com quantidade de compras (RN07 e RN08)
    @Query("select c.cartaoPj.id as cartaoId, c.cartaoPj.apelido as apelido, "
            + "c.cartaoPj.finalCartao as finalCartao, count(c) as quantidade, sum(c.valor) as total "
            + "from Compra c "
            + "where c.usuario.id = :usuarioId and c.cartaoPj is not null "
            + "and c.data between :inicio and :fim "
            + "group by c.cartaoPj.id, c.cartaoPj.apelido, c.cartaoPj.finalCartao "
            + "order by c.cartaoPj.apelido")
    List<TotalPorCartao> totalPorCartao(@Param("usuarioId") Long usuarioId,
                                        @Param("inicio") LocalDate inicio,
                                        @Param("fim") LocalDate fim);

    // Total gasto à vista no período
    @Query("select coalesce(sum(c.valor), 0) from Compra c "
            + "where c.usuario.id = :usuarioId "
            + "and c.formaPagamento = br.com.evandrosgrill.model.enums.FormaPagamentoCompra.A_VISTA "
            + "and c.data between :inicio and :fim")
    BigDecimal totalAVista(@Param("usuarioId") Long usuarioId,
                           @Param("inicio") LocalDate inicio,
                           @Param("fim") LocalDate fim);

    // "Por categoria" da tela Compras
    @Query("select c.categoria.id as categoriaId, c.categoria.nome as nome, sum(c.valor) as total "
            + "from Compra c "
            + "where c.usuario.id = :usuarioId and c.data between :inicio and :fim "
            + "group by c.categoria.id, c.categoria.nome "
            + "order by sum(c.valor) desc")
    List<TotalPorCategoria> totalPorCategoria(@Param("usuarioId") Long usuarioId,
                                              @Param("inicio") LocalDate inicio,
                                              @Param("fim") LocalDate fim);

    // Resultado resumido da consulta totalPorCartao
    interface TotalPorCartao {
        Long getCartaoId();

        String getApelido();

        String getFinalCartao();

        Long getQuantidade();

        BigDecimal getTotal();
    }

    // Resultado resumido da consulta totalPorCategoria
    interface TotalPorCategoria {
        Long getCategoriaId();

        String getNome();

        BigDecimal getTotal();
    }
}
