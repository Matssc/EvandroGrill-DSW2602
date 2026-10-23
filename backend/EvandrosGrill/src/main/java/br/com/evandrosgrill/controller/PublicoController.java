package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.response.ProdutoPublicoResponse;
import br.com.evandrosgrill.service.FotoService;
import br.com.evandrosgrill.service.ProdutoService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

// Landing page: não exige login (liberado no SecurityConfig)
@RestController
@RequestMapping("/api/publico")
@RequiredArgsConstructor
public class PublicoController {

    private final ProdutoService produtoService;
    private final FotoService fotoService;

    @GetMapping("/cardapio")
    public List<ProdutoPublicoResponse> cardapio() {
        return produtoService.listarCardapioPublico();
    }

    // Foto de produto. O nome é um UUID que nunca se repete, então o navegador pode guardar por um ano
    @GetMapping("/fotos/{nome:.+}")
    public ResponseEntity<Resource> foto(@PathVariable("nome") String nome) {
        Resource foto = fotoService.carregar(nome);
        return ResponseEntity.ok()
                .contentType(fotoService.tipoDe(nome))
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .body(foto);
    }
}
