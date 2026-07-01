// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title TrollFarmTycoon Personality NFT
/// @notice ERC-721 representing ownership of a Troll Farm Tycoon personality bot on Base.
contract FakexPersonalityNFT is ERC721, ERC721URIStorage, ERC2981, Ownable {
    uint256 private _nextTokenId;
    uint256 public mintFee;
    address public treasury;

    mapping(uint256 tokenId => string personalityId) public personalityIdOf;
    mapping(string personalityId => uint256 tokenId) public tokenIdOfPersonality;

    event PersonalityMinted(
        uint256 indexed tokenId,
        string personalityId,
        address indexed to,
        string tokenURI
    );

    error AlreadyMinted(string personalityId);
    error InsufficientMintFee(uint256 required, uint256 provided);
    error TreasuryTransferFailed();

    constructor(
        address treasury_,
        uint96 royaltyBps_,
        uint256 mintFee_
    ) ERC721("TrollFarmTycoon", "TFT") Ownable(msg.sender) {
        require(treasury_ != address(0), "Invalid treasury");
        treasury = treasury_;
        mintFee = mintFee_;
        _setDefaultRoyalty(treasury_, royaltyBps_);
    }

    function setMintFee(uint256 mintFee_) external onlyOwner {
        mintFee = mintFee_;
    }

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "Invalid treasury");
        treasury = treasury_;
    }

    /// @notice Mint a personality NFT. One mint per personalityId.
    function mint(
        address to,
        string calldata personalityId,
        string calldata tokenURI_
    ) external payable returns (uint256 tokenId) {
        if (tokenIdOfPersonality[personalityId] != 0) {
            revert AlreadyMinted(personalityId);
        }
        if (msg.value < mintFee) {
            revert InsufficientMintFee(mintFee, msg.value);
        }

        if (msg.value > 0) {
            (bool sent, ) = treasury.call{value: msg.value}("");
            if (!sent) {
                revert TreasuryTransferFailed();
            }
        }

        tokenId = ++_nextTokenId;
        personalityIdOf[tokenId] = personalityId;
        tokenIdOfPersonality[personalityId] = tokenId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        emit PersonalityMinted(tokenId, personalityId, to, tokenURI_);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}
