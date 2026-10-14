package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.MovimentoReserva;
import br.com.evandrosgrill.model.enums.Finalidade;
import br.com.evandrosgrill.model.enums.TipoMovimento;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MovimentoReservaResponse(
        Long id,
        LocalDate data,
        String descricao,
        TipoMovimento tipo,
        Finalidade finalidade,
        BigDecimal valor,
        BigDecimal saldoApos,
        Long fechamentoDiarioId
) {

    // saldoApos = saldo da reserva depois deste movimento (calculado no service)
    public static MovimentoReservaResponse de(MovimentoReserva m, BigDecimal saldoApos) {
        return new MovimentoReservaResponse(
                m.getId(),
                m.getData(),
                m.getDescricao(),
                m.getTipo(),
                m.getFinalidade(),
                m.getValor(),
                saldoApos,
                m.getFechamentoDiario() != null ? m.getFechamentoDiario().getId() : null);
    }
}
