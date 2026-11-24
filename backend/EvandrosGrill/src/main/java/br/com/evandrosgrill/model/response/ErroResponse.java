package br.com.evandrosgrill.model.response;

import java.time.LocalDateTime;
import java.util.List;

// Formato único de erro da API (o Angular lê "mensagem" e, se houver, "detalhes")
public record ErroResponse(
        int status,
        String mensagem,
        List<String> detalhes,
        LocalDateTime timestamp
) {
}
