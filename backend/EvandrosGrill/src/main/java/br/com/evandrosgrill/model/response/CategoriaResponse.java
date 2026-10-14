package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.Categoria;
import br.com.evandrosgrill.model.enums.TipoCategoria;

public record CategoriaResponse(Long id, TipoCategoria tipo, String nome) {

    public static CategoriaResponse de(Categoria c) {
        return new CategoriaResponse(c.getId(), c.getTipo(), c.getNome());
    }
}
