import { ApiError } from '../../../core/http/httpClient.class';
import { classificarErroConsultaConta } from './batch-entry-editor.component';

describe('classificarErroConsultaConta', () => {
  it('classifica um 404 normalizado como conta não encontrada', () => {
    expect(classificarErroConsultaConta(new ApiError(404, 'Conta não encontrada.'))).toBe('not-found');
  });

  it('classifica uma falha de conexão como consulta indisponível', () => {
    expect(classificarErroConsultaConta(new ApiError(0, 'API indisponível.'))).toBe('unavailable');
  });
});
