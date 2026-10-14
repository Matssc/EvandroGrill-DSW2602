package br.com.evandrosgrill.exception;

// Vira resposta 400/422 no tratador de exceções (etapa do controller)
public class RegraNegocioException extends RuntimeException {

    public RegraNegocioException(String mensagem) {
        super(mensagem);
    }
}
