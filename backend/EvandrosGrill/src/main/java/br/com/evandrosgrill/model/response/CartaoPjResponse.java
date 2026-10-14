package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.CartaoPj;

public record CartaoPjResponse(
        Long id,
        String apelido,
        String bandeira,
        String finalCartao,
        Short diaFechamento,
        Short diaVencimento,
        Boolean ativo
) {

    public static CartaoPjResponse de(CartaoPj c) {
        return new CartaoPjResponse(
                c.getId(),
                c.getApelido(),
                c.getBandeira(),
                c.getFinalCartao(),
                c.getDiaFechamento(),
                c.getDiaVencimento(),
                c.getAtivo());
    }
}
