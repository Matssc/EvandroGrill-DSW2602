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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "fechamento_diario",
        uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "data"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FechamentoDiario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "data", nullable = false)
    private LocalDate data;

    @Column(name = "total_vendido", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalVendido;

    @Column(name = "percentual_retirada", nullable = false, precision = 5, scale = 2)
    private BigDecimal percentualRetirada;

    @Column(name = "valor_retirada", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorRetirada;

    @Column(name = "percentual_salario", nullable = false, precision = 5, scale = 2)
    private BigDecimal percentualSalario;

    @Column(name = "valor_salario", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorSalario;

    @Column(name = "valor_reserva", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorReserva;

    @Column(name = "fechado_em", nullable = false)
    private LocalDateTime fechadoEm;
}
