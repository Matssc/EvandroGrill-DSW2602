package br.com.evandrosgrill.model.entity;

import br.com.evandrosgrill.util.Relogio;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "configuracao")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Configuracao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1 usuário tem exatamente 1 configuração
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;

    @Column(name = "percentual_retirada", nullable = false, precision = 5, scale = 2)
    private BigDecimal percentualRetirada;

    @Column(name = "dividir_retirada", nullable = false)
    private Boolean dividirRetirada;

    @Column(name = "percentual_salario", nullable = false, precision = 5, scale = 2)
    private BigDecimal percentualSalario;

    @Column(name = "percentual_reserva", nullable = false, precision = 5, scale = 2)
    private BigDecimal percentualReserva;

    @Column(name = "meta_reserva", precision = 12, scale = 2)
    private BigDecimal metaReserva;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    @PrePersist
    @PreUpdate
    void atualizarData() {
        atualizadoEm = Relogio.agora();
    }
}
