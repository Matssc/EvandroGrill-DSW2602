package br.com.evandrosgrill.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "cartao_pj",
        uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "apelido"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CartaoPj {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "apelido", nullable = false, length = 40)
    private String apelido;

    @Column(name = "bandeira", length = 20)
    private String bandeira;

    @Column(name = "final_cartao", nullable = false, length = 4, columnDefinition = "CHAR(4)")
    private String finalCartao;

    @Column(name = "dia_fechamento")
    private Short diaFechamento;

    @Column(name = "dia_vencimento")
    private Short diaVencimento;

    @Column(name = "ativo", nullable = false)
    private Boolean ativo;
}
