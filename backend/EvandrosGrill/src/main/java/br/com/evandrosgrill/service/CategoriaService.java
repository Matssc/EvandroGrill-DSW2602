package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RecursoNaoEncontradoException;
import br.com.evandrosgrill.exception.RegraNegocioException;
import br.com.evandrosgrill.model.entity.Categoria;
import br.com.evandrosgrill.model.entity.Usuario;
import br.com.evandrosgrill.model.enums.TipoCategoria;
import br.com.evandrosgrill.model.request.CategoriaRequest;
import br.com.evandrosgrill.model.response.CategoriaResponse;
import br.com.evandrosgrill.repository.CategoriaRepository;
import br.com.evandrosgrill.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoriaService {

    // Categorias que toda conta recebe na primeira vez que abre Compras ou Produtos.
    // Sem elas não dá pra lançar compra nem cadastrar produto (o front não tem tela de categorias).
    private static final List<CategoriaPadrao> CATEGORIAS_PADRAO = List.of(
            new CategoriaPadrao(TipoCategoria.COMPRA, "Carnes e insumos"),
            new CategoriaPadrao(TipoCategoria.COMPRA, "Bebidas"),
            new CategoriaPadrao(TipoCategoria.COMPRA, "Descartáveis"),
            new CategoriaPadrao(TipoCategoria.COMPRA, "Contas"),
            new CategoriaPadrao(TipoCategoria.COMPRA, "Manutenção"),
            new CategoriaPadrao(TipoCategoria.PRODUTO, "Carnes"),
            new CategoriaPadrao(TipoCategoria.PRODUTO, "Frango"),
            new CategoriaPadrao(TipoCategoria.PRODUTO, "Especiais"),
            new CategoriaPadrao(TipoCategoria.PRODUTO, "Acompanhamentos"),
            new CategoriaPadrao(TipoCategoria.PRODUTO, "Bebidas"));

    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;

    // tipo é opcional: sem ele, lista as categorias de compra e de produto.
    // Se o usuário ainda não tem nenhuma categoria, cria as padrão antes de listar.
    @Transactional
    public List<CategoriaResponse> listar(Long usuarioId, TipoCategoria tipo) {
        criarPadraoSeNaoTiver(usuarioId);

        List<Categoria> categorias = (tipo == null)
                ? categoriaRepository.findByUsuarioIdOrderByNomeAsc(usuarioId)
                : categoriaRepository.findByUsuarioIdAndTipoOrderByNomeAsc(usuarioId, tipo);
        return categorias.stream().map(CategoriaResponse::de).toList();
    }

    @Transactional
    public CategoriaResponse criar(Long usuarioId, CategoriaRequest request) {
        String nome = request.nome().trim();

        if (categoriaRepository.existsByUsuarioIdAndTipoAndNome(usuarioId, request.tipo(), nome)) {
            throw new RegraNegocioException("Já existe uma categoria com esse nome");
        }

        Categoria categoria = new Categoria();
        categoria.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        categoria.setTipo(request.tipo());
        categoria.setNome(nome);

        return CategoriaResponse.de(categoriaRepository.save(categoria));
    }

    @Transactional
    public CategoriaResponse atualizar(Long usuarioId, Long id, CategoriaRequest request) {
        Categoria categoria = buscarEntidade(usuarioId, id);
        String nome = request.nome().trim();

        // Mudar o tipo de uma categoria em uso bagunçaria compras e produtos já lançados
        if (categoria.getTipo() != request.tipo()) {
            throw new RegraNegocioException("Não é possível mudar o tipo de uma categoria já criada");
        }

        if (!categoria.getNome().equalsIgnoreCase(nome)
                && categoriaRepository.existsByUsuarioIdAndTipoAndNome(usuarioId, categoria.getTipo(), nome)) {
            throw new RegraNegocioException("Já existe uma categoria com esse nome");
        }

        categoria.setNome(nome);
        return CategoriaResponse.de(categoriaRepository.save(categoria));
    }

    @Transactional
    public void excluir(Long usuarioId, Long id) {
        Categoria categoria = buscarEntidade(usuarioId, id);
        try {
            categoriaRepository.delete(categoria);
            categoriaRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new RegraNegocioException(
                    "Esta categoria está em uso por compras ou produtos e não pode ser excluída");
        }
    }

    private Categoria buscarEntidade(Long usuarioId, Long id) {
        return categoriaRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria não encontrada"));
    }

    private void criarPadraoSeNaoTiver(Long usuarioId) {
        if (categoriaRepository.existsByUsuarioId(usuarioId)) {
            return;
        }
        Usuario usuario = usuarioRepository.getReferenceById(usuarioId);
        List<Categoria> categorias = CATEGORIAS_PADRAO.stream()
                .map(padrao -> {
                    Categoria categoria = new Categoria();
                    categoria.setUsuario(usuario);
                    categoria.setTipo(padrao.tipo());
                    categoria.setNome(padrao.nome());
                    return categoria;
                })
                .toList();
        categoriaRepository.saveAll(categorias);
    }

    private record CategoriaPadrao(TipoCategoria tipo, String nome) {
    }
}
