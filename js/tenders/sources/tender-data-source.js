export class TenderDataSource {
  async fetchNoticesByPublicationDay(_date) {
    throw new Error('fetchNoticesByPublicationDay not implemented');
  }

  async fetchNoticesByPublicationRange(_from, _to) {
    throw new Error('fetchNoticesByPublicationRange not implemented');
  }

  normalizeNotice(_rawNotice) {
    throw new Error('normalizeNotice not implemented');
  }

  buildOriginalNoticeUrl(_notice) {
    throw new Error('buildOriginalNoticeUrl not implemented');
  }

  async healthCheck() {
    throw new Error('healthCheck not implemented');
  }
}
