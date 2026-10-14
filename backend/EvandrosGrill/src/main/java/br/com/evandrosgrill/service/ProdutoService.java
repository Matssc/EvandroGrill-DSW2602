package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RecursoNaoEncontradoException;
import br.com.evandrosgrill.exception.RegraNegocioException;
import br.com.evandrosgrill.model.entity.Categoria;
import br.com.evandrosgrill.model.entity.Produto;
import br.com.evandrosgrill.model.enums.TipoCategoria;
import br.com.evandrosgrill.model.request.ProdutoRequest;
import br.com.evandrosgrill.model.response.ProdutoPublicoResponse;
import br.com.evandrosgrill.model.response.ProdutoResponse;
import br.com.evandrosgrill.model.response.ProdutosResumoResponse;
import br.com.evandrosgrill.repository.CategoriaRepository;
import br.com.evandrosgrill.repository.ProdutoRepository;
import br.com.evandrosgrill.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProdutoService {

    private final ProdutoRepository produtoRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;

    // Id do dono do cardápio público (application.properties: app.usuario-publico-id)
    @Value("${app.usuario-publico-id}")
    private Long usuarioPublicoId;

    // Filtros opcionais da tela "Produtos do site": categoria e texto de busca (nome ou código)
    @Transactional(readOnly = true)
    public List<ProdutoResponse> listar(Long usuarioId, Long categoriaId, String busca) {
        List<Produto> produtos;

        if (busca != null && !busca.isBlank()) {
            produtos = produtoRepository.buscar(usuarioId, busca.trim());
            if (categoriaId != null) {
                produtos = produtos.stream()
                        .filter(p -> p.getCategoria().getId().equals(categoriaId))
                        .toList();
            }
        } else if (categoriaId != null) {
            produtos = produtoRepository.findByUsuarioIdAndCategoriaIdOrderByNomeAsc(usuarioId, categoriaId);
        } else {
            produtos = produtoRepository.findByUsuarioIdOrderByNomeAsc(usuarioId);
        }

        return produtos.stream().map(ProdutoResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public ProdutoResponse buscar(Long usuarioId, Long id) {
        return ProdutoResponse.de(buscarEntidade(usuarioId, id));
    }

    // "24 produtos · 21 aparecem no cardápio"
    @Transactional(readOnly = true)
    public ProdutosResumoResponse resumo(Long usuarioId) {
        return new ProdutosResumoResponse(
                produtoRepository.countByUsuarioId(usuarioId),
                produtoRepository.countByUsuarioIdAndMostrarNoSiteTrue(usuarioId));
    }

    @Transactional
    public ProdutoResponse criar(Long usuarioId, ProdutoRequest request) {
        Categoria categoria = buscarCategoriaDeProduto(usuarioId, request.categoriaId());
        String codigo = request.codigo().trim();

        if (produtoRepository.existsByUsuarioIdAndCodigo(usuarioId, codigo)) {
            throw new RegraNegocioException("Já existe um produto com o código " + codigo);
        }

        Produto produto = new Produto();
        produto.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        preencher(produto, request, categoria, codigo);

        return ProdutoResponse.de(produtoRepository.save(produto));
    }

    @Transactional
    public ProdutoResponse atualizar(Long usuarioId, Long id, ProdutoRequest request) {
        Produto produto = buscarEntidade(usuarioId, id);
        Categoria categoria = buscarCategoriaDeProduto(usuarioId, request.categoriaId());
        String codigo = request.codigo().trim();

        if (!produto.getCodigo().equalsIgnoreCase(codigo)
                && produtoRepository.existsByUsuarioIdAndCodigo(usuarioId, codigo)) {
            throw new RegraNegocioException("Já existe um produto com o código " + codigo);
        }

        preencher(produto, request, categoria, codigo);
        return ProdutoResponse.de(produtoRepository.save(produto));
    }

    // Botão "No site" da tabela
    @Transactional
    public ProdutoResponse alterarMostrarNoSite(Long usuarioId, Long id, boolean mostrarNoSite) {
        Produto produto = buscarEntidade(usuarioId, id);
        produto.setMostrarNoSite(mostrarNoSite);
        return ProdutoResponse.de(produtoRepository.save(produto));
    }

    @Transactional
    public void excluir(Long usuarioId, Long id) {
        Produto produto = buscarEntidade(usuarioId, id);
        try {
            produtoRepository.delete(produto);
            produtoRepository.flush();
        } catch (DataIntegrityViolationException e) {
            // As vendas antigas apontam pro produto, então ele precisa continuar existindo
            throw new RegraNegocioException(
                    "Este produto já aparece em vendas e não pode ser excluído. Desligue o \"No site\" pra tirar do cardápio.");
        }
    }

    // Landing page, sem login: só produtos marcados para o site, destaques primeiro
    @Transactional(readOnly = true)
    public List<ProdutoPublicoResponse> listarCardapioPublico() {
        return produtoRepository
                .findByUsuarioIdAndMostrarNoSiteTrueOrderByDestaqueDescNomeAsc(usuarioPublicoId)
                .stream()
                .map(ProdutoPublicoResponse::de)
                .toList();
    }

    private void preencher(Produto produto, ProdutoRequest request, Categoria categoria, String codigo) {
        produto.setCategoria(categoria);
        produto.setCodigo(codigo);
        produto.setNome(request.nome().trim());
        produto.setDescricao(request.descricao());
        produto.setPreco(request.preco());
        produto.setFotoUrl(request.fotoUrl());
        produto.setMostrarNoSite(request.mostrarNoSite());
        produto.setDestaque(request.destaque());
    }

    private Produto buscarEntidade(Long usuarioId, Long id) {
        return produtoRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Produto não encontrado"));
    }

    private Categoria buscarCategoriaDeProduto(Long usuarioId, Long categoriaId) {
        Categoria categoria = categoriaRepository.findByIdAndUsuarioId(categoriaId, usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria não encontrada"));
        if (categoria.getTipo() != TipoCategoria.PRODUTO) {
            throw new RegraNegocioException("Escolha uma categoria do tipo PRODUTO");
        }
        return categoria;
    }
}
