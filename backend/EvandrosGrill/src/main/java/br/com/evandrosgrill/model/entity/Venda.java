package br.com.evandrosgrill.model.entity;

import br.com.evandrosgrill.model.enums.TipoLancamento;
import br.com.evandrosgrill.model.enums.FormaPagamentoVenda;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "venda")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Venda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Fica vazio até a venda ser consolidada num fechamento do dia
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fechamento_diario_id")
    private FechamentoDiario fechamentoDiario;

    @Column(name = "data", nullable = false)
    private LocalDate data;

    @Column(name = "hora")
    private LocalTime hora;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_lancamento", nullable = false, length = 10)
    private TipoLancamento tipoLancamento;

    @Column(name = "origem", length = 60)
    private String origem;

    @Enumerated(EnumType.STRING)
    @Column(name = "forma_pagamento", length = 10)
    private FormaPagamentoVenda formaPagamento;

    @Column(name = "valor", nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    // Produtos da venda. Apagar a venda (ou tirar um item dela) apaga o item junto
    @OneToMany(mappedBy = "venda", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<VendaItem> itens = new ArrayList<>();
}
