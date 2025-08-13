// mock axios before importing the module under test
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn()
  }
}));

import axios from 'axios';
import { uploadFileToPinata, uploadJsonToPinata, uploadFolderToPinata } from '../../utils/pinata';


describe('pinata utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uploadFileToPinata returns IpfsHash on success', async () => {
    axios.post.mockResolvedValueOnce({ data: { IpfsHash: 'QmHashFile' } });
    const fakeFile = new Blob(['hello'], { type: 'text/plain' });
    const hash = await uploadFileToPinata(fakeFile);
    expect(hash).toBe('QmHashFile');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/pinning/pinFileToIPFS'),
      expect.any(FormData),
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  test('uploadJsonToPinata returns IpfsHash on success', async () => {
    axios.post.mockResolvedValueOnce({ data: { IpfsHash: 'QmHashJson' } });
    const payload = { title: 'doc' };
    const hash = await uploadJsonToPinata(payload);
    expect(hash).toBe('QmHashJson');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/pinning/pinJSONToIPFS'),
      payload,
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  test('uploadFolderToPinata returns IpfsHash on success', async () => {
    axios.post.mockResolvedValueOnce({ data: { IpfsHash: 'QmHashFolder' } });
    const files = [
      { path: 'a.txt', content: new Blob(['a'], { type: 'text/plain' }) },
      { path: 'b.txt', content: new Blob(['b'], { type: 'text/plain' }) }
    ];
    const hash = await uploadFolderToPinata(files);
    expect(hash).toBe('QmHashFolder');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/pinning/pinFileToIPFS'),
      expect.any(FormData),
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  test('uploadFolderToPinata throws on error with message', async () => {
    axios.post.mockRejectedValueOnce(new Error('boom'));
    const files = [];
    await expect(uploadFolderToPinata(files)).rejects.toThrow('Pinata upload failed: boom');
  });
});