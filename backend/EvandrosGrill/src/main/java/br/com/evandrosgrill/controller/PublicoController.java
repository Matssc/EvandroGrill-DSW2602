package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.response.ProdutoPublicoResponse;
import br.com.evandrosgrill.service.ProdutoService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Landing page: não exige login (liberado no SecurityConfig)
@RestController
@RequestMapping("/api/publico")
@RequiredArgsConstructor
public class PublicoController {

    private final ProdutoService produtoService;

    @GetMapping("/cardapio")
    public List<ProdutoPublicoResponse> cardapio() {
        return produtoService.listarCardapioPublico();
    }
}
