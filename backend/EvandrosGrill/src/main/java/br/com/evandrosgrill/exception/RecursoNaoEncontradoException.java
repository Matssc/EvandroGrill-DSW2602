package br.com.evandrosgrill.exception;

// Vira resposta 404 no tratador de exceções (etapa do controller)
public class RecursoNaoEncontradoException extends RuntimeException {

    public RecursoNaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
