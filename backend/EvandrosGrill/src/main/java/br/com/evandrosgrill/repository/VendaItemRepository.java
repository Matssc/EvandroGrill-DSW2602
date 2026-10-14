package br.com.evandrosgrill.repository;

import br.com.evandrosgrill.model.entity.VendaItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface VendaItemRepository extends JpaRepository<VendaItem, Long> {

    // Mais vendidos no período: soma das quantidades e dos valores por produto (Vendas do dia, Dashboard, Fechamento)
    @Query("select i.produto.id as produtoId, i.produto.nome as nome, "
            + "sum(i.quantidade) as quantidade, sum(i.quantidade * i.precoUnitario) as total "
            + "from VendaItem i "
            + "where i.venda.usuario.id = :usuarioId and i.venda.data between :inicio and :fim "
            + "group by i.produto.id, i.produto.nome "
            + "order by sum(i.quantidade) desc, i.produto.nome")
    List<TotalPorProduto> maisVendidos(@Param("usuarioId") Long usuarioId,
                                       @Param("inicio") LocalDate inicio,
                                       @Param("fim") LocalDate fim);

    // Resultado resumido da consulta maisVendidos
    interface TotalPorProduto {
        Long getProdutoId();

        String getNome();

        Long getQuantidade();

        BigDecimal getTotal();
    }
}
