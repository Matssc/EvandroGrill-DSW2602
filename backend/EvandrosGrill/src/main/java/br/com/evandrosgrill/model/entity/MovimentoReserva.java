package br.com.evandrosgrill.model.entity;

import br.com.evandrosgrill.model.enums.Finalidade;
import br.com.evandrosgrill.model.enums.TipoMovimento;
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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "movimento_reserva")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MovimentoReserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Preenchido quando o movimento é a entrada gerada por um fechamento diário
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fechamento_diario_id", unique = true)
    private FechamentoDiario fechamentoDiario;

    @Column(name = "data", nullable = false)
    private LocalDate data;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 7)
    private TipoMovimento tipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "finalidade", length = 12)
    private Finalidade finalidade;

    @Column(name = "descricao", nullable = false, length = 150)
    private String descricao;

    @Column(name = "valor", nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;
}
