package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.Configuracao;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Configuração do caixa como a API devolve.
public record ConfiguracaoResponse(
        Long id,
        BigDecimal percentualRetirada,
        Boolean dividirRetirada,
        BigDecimal percentualSalario,
        BigDecimal percentualReserva,
        BigDecimal metaReserva,
        LocalDateTime atualizadoEm
) {

    // Converte a entidade em resposta.
    public static ConfiguracaoResponse de(Configuracao c) {
        return new ConfiguracaoResponse(
                c.getId(),
                c.getPercentualRetirada(),
                c.getDividirRetirada(),
                c.getPercentualSalario(),
                c.getPercentualReserva(),
                c.getMetaReserva(),
                c.getAtualizadoEm());
    }
}
