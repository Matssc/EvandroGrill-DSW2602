package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.Categoria;
import br.com.evandrosgrill.model.enums.TipoCategoria;

// Categoria como a API devolve.
public record CategoriaResponse(Long id, TipoCategoria tipo, String nome) {

    // Converte a entidade em resposta.
    public static CategoriaResponse de(Categoria c) {
        return new CategoriaResponse(c.getId(), c.getTipo(), c.getNome());
    }
}
