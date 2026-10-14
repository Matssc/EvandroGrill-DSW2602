package br.com.evandrosgrill.model.request;

import br.com.evandrosgrill.model.enums.TipoCategoria;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoriaRequest(

        @NotNull(message = "Informe o tipo da categoria")
        TipoCategoria tipo,

        @NotBlank(message = "Informe o nome da categoria")
        @Size(max = 40, message = "O nome deve ter no máximo 40 caracteres")
        String nome
) {
}
