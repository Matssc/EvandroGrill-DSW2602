package br.com.evandrosgrill.service;

import br.com.evandrosgrill.exception.RecursoNaoEncontradoException;
import br.com.evandrosgrill.exception.RegraNegocioException;
import br.com.evandrosgrill.model.entity.CartaoPj;
import br.com.evandrosgrill.model.request.CartaoPjRequest;
import br.com.evandrosgrill.model.response.CartaoPjResponse;
import br.com.evandrosgrill.repository.CartaoPjRepository;
import br.com.evandrosgrill.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// Regras dos cartões PJ (RN07).
@Service
@RequiredArgsConstructor
public class CartaoPjService {

    private final CartaoPjRepository cartaoPjRepository;
    private final UsuarioRepository usuarioRepository;

    // Lista os cartões; com apenasAtivos=true, só os ativos (para o select de Compras).
    @Transactional(readOnly = true)
    public List<CartaoPjResponse> listar(Long usuarioId, boolean apenasAtivos) {
        List<CartaoPj> cartoes = apenasAtivos
                ? cartaoPjRepository.findByUsuarioIdAndAtivoTrueOrderByApelidoAsc(usuarioId)
                : cartaoPjRepository.findByUsuarioIdOrderByApelidoAsc(usuarioId);
        return cartoes.stream().map(CartaoPjResponse::de).toList();
    }

    // Busca um cartão do usuário.
    @Transactional(readOnly = true)
    public CartaoPjResponse buscar(Long usuarioId, Long id) {
        return CartaoPjResponse.de(buscarEntidade(usuarioId, id));
    }

    // Cria o cartão; o apelido não pode repetir.
    @Transactional
    public CartaoPjResponse criar(Long usuarioId, CartaoPjRequest request) {
        String apelido = request.apelido().trim();

        if (cartaoPjRepository.existsByUsuarioIdAndApelido(usuarioId, apelido)) {
            throw new RegraNegocioException("Já existe um cartão com o apelido " + apelido);
        }

        CartaoPj cartao = new CartaoPj();
        cartao.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        preencher(cartao, request, apelido);

        return CartaoPjResponse.de(cartaoPjRepository.save(cartao));
    }

    // Atualiza o cartão; o apelido novo não pode ser de outro cartão.
    @Transactional
    public CartaoPjResponse atualizar(Long usuarioId, Long id, CartaoPjRequest request) {
        CartaoPj cartao = buscarEntidade(usuarioId, id);
        String apelido = request.apelido().trim();

        if (!cartao.getApelido().equalsIgnoreCase(apelido)
                && cartaoPjRepository.existsByUsuarioIdAndApelido(usuarioId, apelido)) {
            throw new RegraNegocioException("Já existe um cartão com o apelido " + apelido);
        }

        preencher(cartao, request, apelido);
        return CartaoPjResponse.de(cartaoPjRepository.save(cartao));
    }

    // Exclui; se houver compras ligadas, o banco recusa e vira mensagem de regra.
    @Transactional
    public void excluir(Long usuarioId, Long id) {
        CartaoPj cartao = buscarEntidade(usuarioId, id);
        try {
            cartaoPjRepository.delete(cartao);
            cartaoPjRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new RegraNegocioException(
                    "Este cartão tem compras lançadas e não pode ser excluído. Desative o cartão.");
        }
    }

    // Copia os campos do request para a entidade.
    private void preencher(CartaoPj cartao, CartaoPjRequest request, String apelido) {
        cartao.setApelido(apelido);
        cartao.setBandeira(request.bandeira());
        cartao.setFinalCartao(request.finalCartao());
        cartao.setDiaFechamento(request.diaFechamento());
        cartao.setDiaVencimento(request.diaVencimento());
        cartao.setAtivo(request.ativo());
    }

    // Busca o cartão garantindo que é do usuário (senão 404).
    private CartaoPj buscarEntidade(Long usuarioId, Long id) {
        return cartaoPjRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cartão não encontrado"));
    }
}
