package br.com.evandrosgrill.controller;

import br.com.evandrosgrill.model.request.ProdutoRequest;
import br.com.evandrosgrill.model.response.FotoResponse;
import br.com.evandrosgrill.model.response.ProdutoResponse;
import br.com.evandrosgrill.model.response.ProdutosResumoResponse;
import br.com.evandrosgrill.service.FotoService;
import br.com.evandrosgrill.service.ProdutoService;
import br.com.evandrosgrill.util.Autenticacao;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/produtos")
@RequiredArgsConstructor
public class ProdutoController {

    private final ProdutoService produtoService;
    private final FotoService fotoService;

    // Tela "Produtos do site": filtros opcionais por categoria e por texto (nome ou código)
    @GetMapping
    public List<ProdutoResponse> listar(@AuthenticationPrincipal Jwt jwt,
                                        @RequestParam(name = "categoriaId", required = false) Long categoriaId,
                                        @RequestParam(name = "busca", required = false) String busca) {
        return produtoService.listar(Autenticacao.usuarioId(jwt), categoriaId, busca);
    }

    // "24 produtos · 21 aparecem no cardápio"
    @GetMapping("/resumo")
    public ProdutosResumoResponse resumo(@AuthenticationPrincipal Jwt jwt) {
        return produtoService.resumo(Autenticacao.usuarioId(jwt));
    }

    @GetMapping("/{id}")
    public ProdutoResponse buscar(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id) {
        return produtoService.buscar(Autenticacao.usuarioId(jwt), id);
    }

    // Tela "Produtos do site": envia o arquivo da foto e devolve o endereço pra guardar em fotoUrl
    @PostMapping(value = "/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FotoResponse enviarFoto(@RequestPart("arquivo") MultipartFile arquivo) {
        return new FotoResponse(fotoService.salvar(arquivo));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProdutoResponse criar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProdutoRequest request) {
        return produtoService.criar(Autenticacao.usuarioId(jwt), request);
    }

    @PutMapping("/{id}")
    public ProdutoResponse atualizar(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id,
                                     @Valid @RequestBody ProdutoRequest request) {
        return produtoService.atualizar(Autenticacao.usuarioId(jwt), id, request);
    }

    // Botão "No site" da tabela: PATCH /api/produtos/7/no-site?valor=false
    @PatchMapping("/{id}/no-site")
    public ProdutoResponse alterarNoSite(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id,
                                         @RequestParam(name = "valor") boolean valor) {
        return produtoService.alterarMostrarNoSite(Autenticacao.usuarioId(jwt), id, valor);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") Long id) {
        produtoService.excluir(Autenticacao.usuarioId(jwt), id);
    }
}
