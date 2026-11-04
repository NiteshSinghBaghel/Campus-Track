import { DYPIUJunoAdapter } from './DYPIUJunoAdapter.js';

export class MGMJunoAdapter extends DYPIUJunoAdapter {
  override readonly universityCode = 'MGMU';

  constructor(baseUrl = 'https://erp.mgmu.ac.in', debug = false) {
    super(baseUrl, debug);
  }
}

